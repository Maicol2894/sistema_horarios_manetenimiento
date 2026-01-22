// server.js - Backend para conectar con SQL Server
// Instalar dependencias: npm install express mssql cors body-parser dotenv

require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // En producción, especifica el dominio del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de la conexión a SQL Server
const config = {
  server: process.env.DB_SERVER || '(localdb)\\MSSQLLocalDB',
  database: process.env.DB_DATABASE || 'master_upca',
  options: {
    trustedConnection: true,
    enableArithAbort: true,
    instanceName: process.env.DB_INSTANCE || 'MSSQLLocalDB',
    trustServerCertificate: true,
    encrypt: false
  }
};

// Si tienes usuario y contraseña, usa esta configuración:
// const config = {
//   server: process.env.DB_SERVER,
//   database: process.env.DB_DATABASE,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   options: {
//     encrypt: process.env.DB_ENCRYPT === 'true',
//     trustServerCertificate: true
//   }
// };

// Pool de conexiones
let pool;

// Conectar a SQL Server
async function connectDB() {
  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server LocalDB');
    console.log(`📊 Base de datos: ${config.database}`);
    console.log(`🔌 Servidor: ${config.server}`);
  } catch (err) {
    console.error('❌ Error conectando a SQL Server:', err);
    console.error('Verifica que SQL Server LocalDB esté corriendo: sqllocaldb info');
  }
}

connectDB();

// Middleware para verificar conexión
app.use((req, res, next) => {
  if (!pool || !pool.connected) {
    return res.status(503).json({ 
      error: 'Base de datos no disponible. Verifica que SQL Server esté corriendo.' 
    });
  }
  next();
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Sistema de Horarios - Funcionando',
    database: config.database,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// FUNCIONES - CRUD
// ==========================================

// Obtener todas las funciones
app.get('/api/funciones', async (req, res) => {
  try {
    const result = await pool.request()
      .query('SELECT * FROM Funciones WHERE Activo = 1 ORDER BY NombreFuncion');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear función
app.post('/api/funciones', async (req, res) => {
  try {
    const { nombreFuncion, descripcion } = req.body;
    await pool.request()
      .input('nombreFuncion', sql.NVarChar, nombreFuncion)
      .input('descripcion', sql.NVarChar, descripcion)
      .query('INSERT INTO Funciones (NombreFuncion, Descripcion) VALUES (@nombreFuncion, @descripcion)');
    res.json({ success: true, message: 'Función creada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar función
app.put('/api/funciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreFuncion, descripcion } = req.body;
    await pool.request()
      .input('id', sql.Int, id)
      .input('nombreFuncion', sql.NVarChar, nombreFuncion)
      .input('descripcion', sql.NVarChar, descripcion)
      .query('UPDATE Funciones SET NombreFuncion = @nombreFuncion, Descripcion = @descripcion WHERE IdFuncion = @id');
    res.json({ success: true, message: 'Función actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar función (soft delete)
app.delete('/api/funciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE Funciones SET Activo = 0 WHERE IdFuncion = @id');
    res.json({ success: true, message: 'Función eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FUNCIONARIOS - CRUD
// ==========================================

// Obtener todos los funcionarios con sus funciones
app.get('/api/funcionarios', async (req, res) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT 
          f.Cedula,
          f.NombreCompleto,
          f.Turno,
          f.Observaciones,
          STRING_AGG(fn.NombreFuncion, ',') AS FuncionesAsignadas
        FROM Funcionarios f
        LEFT JOIN FuncionariosFunciones ff ON f.Cedula = ff.FuncionarioCedula AND ff.Activo = 1
        LEFT JOIN Funciones fn ON ff.IdFuncion = fn.IdFuncion
        WHERE f.Activo = 1
        GROUP BY f.Cedula, f.NombreCompleto, f.Turno, f.Observaciones
        ORDER BY f.NombreCompleto
      `);
    
    const funcionarios = result.recordset.map(f => ({
      ...f,
      funcionesAsignadas: f.FuncionesAsignadas ? f.FuncionesAsignadas.split(',') : []
    }));
    
    res.json(funcionarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear funcionario
app.post('/api/funcionarios', async (req, res) => {
  try {
    const { cedula, nombreCompleto, turno, funcionesAsignadas, observaciones } = req.body;
    
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      // Insertar funcionario
      await transaction.request()
        .input('cedula', sql.VarChar, cedula)
        .input('nombreCompleto', sql.NVarChar, nombreCompleto)
        .input('turno', sql.NVarChar, turno)
        .input('observaciones', sql.NVarChar, observaciones)
        .query('INSERT INTO Funcionarios (Cedula, NombreCompleto, Turno, Observaciones) VALUES (@cedula, @nombreCompleto, @turno, @observaciones)');
      
      // Asignar funciones
      if (funcionesAsignadas && funcionesAsignadas.length > 0) {
        for (const nombreFuncion of funcionesAsignadas) {
          const funcResult = await transaction.request()
            .input('nombreFuncion', sql.NVarChar, nombreFuncion)
            .query('SELECT IdFuncion FROM Funciones WHERE NombreFuncion = @nombreFuncion');
          
          if (funcResult.recordset.length > 0) {
            await transaction.request()
              .input('cedula', sql.VarChar, cedula)
              .input('idFuncion', sql.Int, funcResult.recordset[0].IdFuncion)
              .query('INSERT INTO FuncionariosFunciones (FuncionarioCedula, IdFuncion) VALUES (@cedula, @idFuncion)');
          }
        }
      }
      
      await transaction.commit();
      res.json({ success: true, message: 'Funcionario creado' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar funcionario
app.put('/api/funcionarios/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;
    const { nombreCompleto, turno, funcionesAsignadas, observaciones } = req.body;
    
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      // Actualizar funcionario
      await transaction.request()
        .input('cedula', sql.VarChar, cedula)
        .input('nombreCompleto', sql.NVarChar, nombreCompleto)
        .input('turno', sql.NVarChar, turno)
        .input('observaciones', sql.NVarChar, observaciones)
        .query('UPDATE Funcionarios SET NombreCompleto = @nombreCompleto, Turno = @turno, Observaciones = @observaciones WHERE Cedula = @cedula');
      
      // Desactivar funciones anteriores
      await transaction.request()
        .input('cedula', sql.VarChar, cedula)
        .query('UPDATE FuncionariosFunciones SET Activo = 0 WHERE FuncionarioCedula = @cedula');
      
      // Asignar nuevas funciones
      if (funcionesAsignadas && funcionesAsignadas.length > 0) {
        for (const nombreFuncion of funcionesAsignadas) {
          const funcResult = await transaction.request()
            .input('nombreFuncion', sql.NVarChar, nombreFuncion)
            .query('SELECT IdFuncion FROM Funciones WHERE NombreFuncion = @nombreFuncion');
          
          if (funcResult.recordset.length > 0) {
            const idFuncion = funcResult.recordset[0].IdFuncion;
            
            // Verificar si ya existe la relación
            const existeResult = await transaction.request()
              .input('cedula', sql.VarChar, cedula)
              .input('idFuncion', sql.Int, idFuncion)
              .query('SELECT * FROM FuncionariosFunciones WHERE FuncionarioCedula = @cedula AND IdFuncion = @idFuncion');
            
            if (existeResult.recordset.length > 0) {
              // Reactivar
              await transaction.request()
                .input('cedula', sql.VarChar, cedula)
                .input('idFuncion', sql.Int, idFuncion)
                .query('UPDATE FuncionariosFunciones SET Activo = 1 WHERE FuncionarioCedula = @cedula AND IdFuncion = @idFuncion');
            } else {
              // Insertar nuevo
              await transaction.request()
                .input('cedula', sql.VarChar, cedula)
                .input('idFuncion', sql.Int, idFuncion)
                .query('INSERT INTO FuncionariosFunciones (FuncionarioCedula, IdFuncion) VALUES (@cedula, @idFuncion)');
            }
          }
        }
      }
      
      await transaction.commit();
      res.json({ success: true, message: 'Funcionario actualizado' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar funcionario
app.delete('/api/funcionarios/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;
    await pool.request()
      .input('cedula', sql.VarChar, cedula)
      .query('UPDATE Funcionarios SET Activo = 0 WHERE Cedula = @cedula');
    res.json({ success: true, message: 'Funcionario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TURNOS - CRUD
// ==========================================

// Obtener todos los turnos
app.get('/api/turnos', async (req, res) => {
  try {
    const result = await pool.request()
      .query('SELECT * FROM Turnos WHERE Activo = 1 ORDER BY NombreTurno');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear turno
app.post('/api/turnos', async (req, res) => {
  try {
    const { nombreTurno, horaEntrada, horaSalidaManana, horaEntradaTarde, horaSalidaFinal, descripcion } = req.body;
    await pool.request()
      .input('nombreTurno', sql.NVarChar, nombreTurno)
      .input('horaEntrada', sql.Time, horaEntrada)
      .input('horaSalidaManana', sql.Time, horaSalidaManana || null)
      .input('horaEntradaTarde', sql.Time, horaEntradaTarde || null)
      .input('horaSalidaFinal', sql.Time, horaSalidaFinal)
      .input('descripcion', sql.NVarChar, descripcion)
      .query('INSERT INTO Turnos (NombreTurno, HoraEntrada, HoraSalidaManana, HoraEntradaTarde, HoraSalidaFinal, Descripcion) VALUES (@nombreTurno, @horaEntrada, @horaSalidaManana, @horaEntradaTarde, @horaSalidaFinal, @descripcion)');
    res.json({ success: true, message: 'Turno creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar turno
app.put('/api/turnos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreTurno, horaEntrada, horaSalidaManana, horaEntradaTarde, horaSalidaFinal, descripcion } = req.body;
    await pool.request()
      .input('id', sql.Int, id)
      .input('nombreTurno', sql.NVarChar, nombreTurno)
      .input('horaEntrada', sql.Time, horaEntrada)
      .input('horaSalidaManana', sql.Time, horaSalidaManana || null)
      .input('horaEntradaTarde', sql.Time, horaEntradaTarde || null)
      .input('horaSalidaFinal', sql.Time, horaSalidaFinal)
      .input('descripcion', sql.NVarChar, descripcion)
      .query('UPDATE Turnos SET NombreTurno = @nombreTurno, HoraEntrada = @horaEntrada, HoraSalidaManana = @horaSalidaManana, HoraEntradaTarde = @horaEntradaTarde, HoraSalidaFinal = @horaSalidaFinal, Descripcion = @descripcion WHERE IdTurno = @id');
    res.json({ success: true, message: 'Turno actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar turno
app.delete('/api/turnos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE Turnos SET Activo = 0 WHERE IdTurno = @id');
    res.json({ success: true, message: 'Turno eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// HORARIOS - CRUD
// ==========================================

// Obtener todos los horarios con cálculo de recargo
app.get('/api/horarios', async (req, res) => {
  try {
    const result = await pool.request()
      .query('SELECT * FROM VW_HorariosCompletos ORDER BY FechaDesde DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear horario
app.post('/api/horarios', async (req, res) => {
  try {
    const { funcionarioCedula, turnoNombre, fechaDesde, fechaHasta, observaciones } = req.body;
    
    // Obtener IdTurno
    const turnoResult = await pool.request()
      .input('turnoNombre', sql.NVarChar, turnoNombre)
      .query('SELECT IdTurno FROM Turnos WHERE NombreTurno = @turnoNombre');
    
    if (turnoResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Turno no encontrado' });
    }
    
    const idTurno = turnoResult.recordset[0].IdTurno;
    
    await pool.request()
      .input('funcionarioCedula', sql.VarChar, funcionarioCedula)
      .input('idTurno', sql.Int, idTurno)
      .input('fechaDesde', sql.Date, fechaDesde)
      .input('fechaHasta', sql.Date, fechaHasta)
      .input('observaciones', sql.NVarChar, observaciones)
      .query('INSERT INTO Horarios (FuncionarioCedula, IdTurno, FechaDesde, FechaHasta, Observaciones) VALUES (@funcionarioCedula, @idTurno, @fechaDesde, @fechaHasta, @observaciones)');
    
    res.json({ success: true, message: 'Horario creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar horario
app.put('/api/horarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { funcionarioCedula, turnoNombre, fechaDesde, fechaHasta, observaciones } = req.body;
    
    const turnoResult = await pool.request()
      .input('turnoNombre', sql.NVarChar, turnoNombre)
      .query('SELECT IdTurno FROM Turnos WHERE NombreTurno = @turnoNombre');
    
    if (turnoResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Turno no encontrado' });
    }
    
    const idTurno = turnoResult.recordset[0].IdTurno;
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('funcionarioCedula', sql.VarChar, funcionarioCedula)
      .input('idTurno', sql.Int, idTurno)
      .input('fechaDesde', sql.Date, fechaDesde)
      .input('fechaHasta', sql.Date, fechaHasta)
      .input('observaciones', sql.NVarChar, observaciones)
      .query('UPDATE Horarios SET FuncionarioCedula = @funcionarioCedula, IdTurno = @idTurno, FechaDesde = @fechaDesde, FechaHasta = @fechaHasta, Observaciones = @observaciones WHERE IdHorario = @id');
    
    res.json({ success: true, message: 'Horario actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar horario
app.delete('/api/horarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE Horarios SET Activo = 0 WHERE IdHorario = @id');
    res.json({ success: true, message: 'Horario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: master_upca`);
  console.log(`🔌 SQL Server: (localdb)\\MSSQLLocalDB`);
});