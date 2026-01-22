🏢 Sistema de Gestión de Horarios - Personal de Mantenimiento
Sistema completo para gestionar horarios, turnos y funciones del personal de mantenimiento con cálculo automático de horas de recargo nocturno.
📋 Requisitos Previos

Node.js v14 o superior - Descargar
SQL Server LocalDB o SQL Server Express
Git - Descargar

🚀 Instalación Rápida
1. Clonar el Repositorio
bashgit clone https://github.com/Maicol2894/sistema_horarios_manetenimiento.git
cd sistema_horarios_manetenimiento
2. Configurar la Base de Datos
Opción A: Usando PowerShell
powershell# Verificar que LocalDB esté instalado
sqllocaldb info

# Si no está corriendo, iniciarlo
sqllocaldb start MSSQLLocalDB

# Crear la base de datos
sqlcmd -S "(localdb)\MSSQLLocalDB" -i database/script_database.sql
Opción B: Usando SQL Server Management Studio (SSMS)

Abrir SSMS
Conectar a: (localdb)\MSSQLLocalDB
Abrir el archivo database/script_database.sql
Ejecutar (F5)

3. Configurar el Backend
bashcd backend

# Instalar dependencias
npm install

# Crear archivo .env
copy .env.example .env
# O en Linux/Mac: cp .env.example .env

# Editar .env con tus configuraciones si es necesario
Contenido del archivo .env:
envPORT=3001
DB_SERVER=(localdb)\\MSSQLLocalDB
DB_DATABASE=master_upca
DB_INSTANCE=MSSQLLocalDB
4. Probar la Conexión
bashnpm run test
Deberías ver:
✅ Conexión exitosa!
✅ Base de datos 'master_upca' encontrada
📊 Tablas encontradas:
  - Funciones
  - Funcionarios
  - FuncionariosFunciones
  - Turnos
  - Horarios
  - HistorialCambios
✅ Todas las pruebas pasaron correctamente!
5. Iniciar el Backend
bash# Modo desarrollo (con auto-reload)
npm run dev

# O modo producción
npm start
Deberías ver:
✅ Conectado a SQL Server LocalDB
🚀 Servidor corriendo en http://localhost:3001
📊 Base de datos: master_upca
6. Configurar y Ejecutar el Frontend
bash# En otra terminal, ir a la carpeta frontend
cd ../frontend

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
El sistema estará disponible en: http://localhost:5173
📁 Estructura del Proyecto
sistema_horarios_mantenimiento/
├── backend/
│   ├── server.js              # Servidor principal
│   ├── package.json           # Dependencias backend
│   ├── .env                   # Configuración (NO subir a git)
│   ├── .env.example          # Ejemplo de configuración
│   └── test-connection.js    # Script de prueba
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Componente principal
│   │   └── components/       # Componentes React
│   ├── package.json          # Dependencias frontend
│   └── vite.config.js        # Configuración Vite
│
├── database/
│   └── script_database.sql   # Script de creación de BD
│
└── README.md                 # Esta guía
🔌 Endpoints de la API
Funciones

GET    /api/funciones - Listar todas
POST   /api/funciones - Crear nueva
PUT    /api/funciones/:id - Actualizar
DELETE /api/funciones/:id - Eliminar (soft delete)

Funcionarios

GET    /api/funcionarios - Listar todos
POST   /api/funcionarios - Crear nuevo
PUT    /api/funcionarios/:cedula - Actualizar
DELETE /api/funcionarios/:cedula - Eliminar

Turnos

GET    /api/turnos - Listar todos
POST   /api/turnos - Crear nuevo
PUT    /api/turnos/:id - Actualizar
DELETE /api/turnos/:id - Eliminar

Horarios

GET    /api/horarios - Listar todos (con cálculo automático de recargo)
POST   /api/horarios - Crear nuevo
PUT    /api/horarios/:id - Actualizar
DELETE /api/horarios/:id - Eliminar

🧪 Probar la API
Con PowerShell:
powershell# Listar funciones
Invoke-RestMethod -Uri http://localhost:3001/api/funciones

# Crear función
$body = @{
    nombreFuncion = "Electricista"
    descripcion = "Mantenimiento eléctrico"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/funciones -Method POST -Body $body -ContentType "application/json"
Con cURL:
bash# Listar funcionarios
curl http://localhost:3001/api/funcionarios

# Crear funcionario
curl -X POST http://localhost:3001/api/funcionarios \
  -H "Content-Type: application/json" \
  -d '{
    "cedula": "1234567890",
    "nombreCompleto": "Juan Pérez",
    "turno": "Diurno",
    "funcionesAsignadas": ["Electricista"],
    "observaciones": "Nuevo empleado"
  }'
🐛 Solución de Problemas
Error: "Cannot connect to SQL Server"
Solución:
powershell# 1. Verificar LocalDB
sqllocaldb info

# 2. Iniciar LocalDB si no está corriendo
sqllocaldb start MSSQLLocalDB

# 3. Verificar que la base de datos existe
sqlcmd -S "(localdb)\MSSQLLocalDB" -Q "SELECT name FROM sys.databases WHERE name = 'master_upca'"
Error: "Port 3001 already in use"
Solución: Cambiar el puerto en .env:
envPORT=3002
Error: "CORS policy blocked"
Solución: Ya está configurado CORS en el backend. Si persiste, verifica que el frontend use http://localhost:3001 (no https).
La tabla está vacía
Solución: Ejecuta el script SQL que incluye datos de ejemplo:
sqlUSE master_upca;

-- Verificar datos
SELECT * FROM Funciones;
SELECT * FROM Funcionarios;
SELECT * FROM Turnos;
SELECT * FROM Horarios;
📊 Características del Sistema
✅ Módulo de Funciones

Crear catálogo de funciones laborales
Editar y eliminar funciones
Asignar múltiples funciones a funcionarios

✅ Módulo de Funcionarios

Registro con cédula, nombre, turno
Selección múltiple de funciones (checkboxes)
Observaciones personalizadas

✅ Módulo de Turnos

Crear turnos personalizados
Configurar horarios (mañana/tarde)
Sin necesidad de ingresar horas de recargo manualmente

✅ Módulo de Horarios

Asignar turnos a funcionarios
Definir rangos de fechas
Cálculo automático de horas de recargo nocturno (desde las 19:00)
Multiplicación automática por días del rango
Vista previa del cálculo antes de guardar

✅ Exportación

Exportar a Excel/CSV
Incluye todos los cálculos de recargo
Formato en español

📝 Cálculo de Horas de Recargo
El sistema calcula automáticamente las horas de recargo nocturno:

Hora de inicio: 19:00 (7:00 PM)
Lógica: Cuenta las horas trabajadas después de las 19:00
Multiplicación: Multiplica por los días del rango de fechas

Ejemplo:

Turno: 14:00 - 22:00
Horas después de 19:00: 3 horas
Rango: 01/01/2025 a 15/01/2025 = 15 días
Total recargo: 45 horas (3 × 15)

🔐 Seguridad

Soft deletes (los registros no se eliminan físicamente)
Validaciones en backend y frontend
Prepared statements para evitar SQL injection
CORS configurado

📞 Soporte
Si tienes problemas:

Revisa los logs del backend en la consola
Ejecuta npm run test para verificar la conexión
Verifica que todas las tablas existan en SQL Server
Asegúrate que el puerto 3001 no esté en uso

🚀 Siguientes Pasos

Ejecutar npm run test en backend
Iniciar backend con npm start
Iniciar frontend con npm run dev
Acceder a http://localhost:5173
Empezar a registrar datos