// test-connection.js - Script para probar la conexión a SQL Server
require('dotenv').config();
const sql = require('mssql');

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

async function testConnection() {
  console.log('🔍 Probando conexión a SQL Server...');
  console.log('Configuración:', {
    server: config.server,
    database: config.database,
    instance: config.options.instanceName
  });
  
  try {
    // Conectar
    const pool = await sql.connect(config);
    console.log('✅ Conexión exitosa!\n');
    
    // Verificar base de datos
    const dbCheck = await pool.request().query(`
      SELECT name FROM sys.databases WHERE name = '${config.database}'
    `);
    
    if (dbCheck.recordset.length > 0) {
      console.log(`✅ Base de datos '${config.database}' encontrada\n`);
    } else {
      console.log(`❌ Base de datos '${config.database}' NO encontrada`);
      console.log('Ejecuta el script SQL primero para crear la base de datos\n');
      await pool.close();
      return;
    }
    
    // Verificar tablas
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 Tablas encontradas:');
    tables.recordset.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });
    
    // Contar registros
    console.log('\n📈 Registros en cada tabla:');
    
    const funciones = await pool.request().query('SELECT COUNT(*) as total FROM Funciones WHERE Activo = 1');
    console.log(`  - Funciones: ${funciones.recordset[0].total}`);
    
    const funcionarios = await pool.request().query('SELECT COUNT(*) as total FROM Funcionarios WHERE Activo = 1');
    console.log(`  - Funcionarios: ${funcionarios.recordset[0].total}`);
    
    const turnos = await pool.request().query('SELECT COUNT(*) as total FROM Turnos WHERE Activo = 1');
    console.log(`  - Turnos: ${turnos.recordset[0].total}`);
    
    const horarios = await pool.request().query('SELECT COUNT(*) as total FROM Horarios WHERE Activo = 1');
    console.log(`  - Horarios: ${horarios.recordset[0].total}`);
    
    console.log('\n✅ Todas las pruebas pasaron correctamente!');
    console.log('El backend está listo para usarse.\n');
    
    await pool.close();
    
  } catch (err) {
    console.error('\n❌ Error durante las pruebas:');
    console.error(err.message);
    console.error('\n💡 Posibles soluciones:');
    console.error('1. Verifica que SQL Server LocalDB esté corriendo:');
    console.error('   sqllocaldb info');
    console.error('   sqllocaldb start MSSQLLocalDB');
    console.error('\n2. Verifica que la base de datos exista:');
    console.error('   Ejecuta el script SQL para crear master_upca');
    console.error('\n3. Verifica la configuración en el archivo .env\n');
  }
}

testConnection();