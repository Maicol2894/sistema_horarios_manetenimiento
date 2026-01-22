import React, { useState, useEffect } from 'react';
import { Download, Plus, Edit2, Trash2, Save, X, Search, Calendar, Clock, Users } from 'lucide-react';

const SistemaHorarios = () => {
  const [activeTab, setActiveTab] = useState('funcionarios');
  const [funcionarios, setFuncionarios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [filtros, setFiltros] = useState({
    funcionario: '',
    turno: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  const [formData, setFormData] = useState({});

  // Cargar datos del storage
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const funcResult = await window.storage.get('funcionarios');
      const turnosResult = await window.storage.get('turnos');
      const horariosResult = await window.storage.get('horarios');
      
      if (funcResult) setFuncionarios(JSON.parse(funcResult.value));
      if (turnosResult) setTurnos(JSON.parse(turnosResult.value));
      if (horariosResult) setHorarios(JSON.parse(horariosResult.value));
    } catch (error) {
      console.log('Primera carga o sin datos previos');
    }
  };

  const guardarDatos = async (tipo, datos) => {
    try {
      await window.storage.set(tipo, JSON.stringify(datos));
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const abrirModal = (tipo, item = null) => {
    setModalType(tipo);
    setEditingItem(item);
    
    if (tipo === 'funcionario') {
      setFormData(item || {
        cedula: '',
        nombreCompleto: '',
        turno: '',
        funciones: '',
        observaciones: ''
      });
    } else if (tipo === 'turno') {
      setFormData(item || {
        nombreTurno: '',
        horaEntrada: '',
        horaSalidaManana: '',
        horaEntradaTarde: '',
        horaSalidaFinal: '',
        horasRecargoNocturno: ''
      });
    } else if (tipo === 'horario') {
      setFormData(item || {
        funcionarioCedula: '',
        turnoNombre: '',
        fechaDesde: '',
        fechaHasta: ''
      });
    }
    
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
  };

  const guardarFuncionario = () => {
    let nuevosFunc;
    if (editingItem) {
      nuevosFunc = funcionarios.map(f => 
        f.cedula === editingItem.cedula ? formData : f
      );
    } else {
      nuevosFunc = [...funcionarios, formData];
    }
    setFuncionarios(nuevosFunc);
    guardarDatos('funcionarios', nuevosFunc);
    cerrarModal();
  };

  const eliminarFuncionario = (cedula) => {
    const nuevosFunc = funcionarios.filter(f => f.cedula !== cedula);
    setFuncionarios(nuevosFunc);
    guardarDatos('funcionarios', nuevosFunc);
  };

  const guardarTurno = () => {
    let nuevosTurnos;
    if (editingItem) {
      nuevosTurnos = turnos.map(t => 
        t.nombreTurno === editingItem.nombreTurno ? formData : t
      );
    } else {
      nuevosTurnos = [...turnos, formData];
    }
    setTurnos(nuevosTurnos);
    guardarDatos('turnos', nuevosTurnos);
    cerrarModal();
  };

  const eliminarTurno = (nombreTurno) => {
    const nuevosTurnos = turnos.filter(t => t.nombreTurno !== nombreTurno);
    setTurnos(nuevosTurnos);
    guardarDatos('turnos', nuevosTurnos);
  };

  const guardarHorario = () => {
    const funcionario = funcionarios.find(f => f.cedula === formData.funcionarioCedula);
    const turno = turnos.find(t => t.nombreTurno === formData.turnoNombre);
    
    const horarioCompleto = {
      ...formData,
      funcionarioNombre: funcionario?.nombreCompleto || '',
      turnoDetalle: turno
    };

    let nuevosHorarios;
    if (editingItem) {
      nuevosHorarios = horarios.map((h, idx) => 
        idx === horarios.indexOf(editingItem) ? horarioCompleto : h
      );
    } else {
      nuevosHorarios = [...horarios, horarioCompleto];
    }
    setHorarios(nuevosHorarios);
    guardarDatos('horarios', nuevosHorarios);
    cerrarModal();
  };

  const eliminarHorario = (index) => {
    const nuevosHorarios = horarios.filter((_, idx) => idx !== index);
    setHorarios(nuevosHorarios);
    guardarDatos('horarios', nuevosHorarios);
  };

  const horariosFiltrados = horarios.filter(h => {
    if (filtros.funcionario && !h.funcionarioNombre.toLowerCase().includes(filtros.funcionario.toLowerCase())) {
      return false;
    }
    if (filtros.turno && h.turnoNombre !== filtros.turno) {
      return false;
    }
    if (filtros.fechaDesde && h.fechaHasta < filtros.fechaDesde) {
      return false;
    }
    if (filtros.fechaHasta && h.fechaDesde > filtros.fechaHasta) {
      return false;
    }
    return true;
  });

  const exportarExcel = () => {
    const datos = horariosFiltrados.map(h => {
      const turno = h.turnoDetalle || {};
      return {
        'Funcionario': h.funcionarioNombre,
        'Cédula': h.funcionarioCedula,
        'Turno': h.turnoNombre,
        'Fecha Desde': h.fechaDesde,
        'Fecha Hasta': h.fechaHasta,
        'Hora Entrada': turno.horaEntrada || '',
        'Hora Salida Mañana': turno.horaSalidaManana || '',
        'Hora Entrada Tarde': turno.horaEntradaTarde || '',
        'Hora Salida Final': turno.horaSalidaFinal || '',
        'Horas Recargo Nocturno': turno.horasRecargoNocturno || ''
      };
    });

    const headers = Object.keys(datos[0] || {});
    const csv = [
      headers.join(','),
      ...datos.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `horarios_mantenimiento_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Sistema de Gestión de Horarios</h1>
          <p className="text-red-100 mt-1">Personal de Mantenimiento</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('funcionarios')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'funcionarios'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <Users className="inline-block w-5 h-5 mr-2" />
              Funcionarios
            </button>
            <button
              onClick={() => setActiveTab('turnos')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'turnos'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <Clock className="inline-block w-5 h-5 mr-2" />
              Turnos
            </button>
            <button
              onClick={() => setActiveTab('horarios')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'horarios'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <Calendar className="inline-block w-5 h-5 mr-2" />
              Horarios
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container mx-auto px-4 py-8">
        {/* Módulo Funcionarios */}
        {activeTab === 'funcionarios' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Funcionarios de Mantenimiento</h2>
              <button
                onClick={() => abrirModal('funcionario')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nuevo Funcionario
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cédula</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre Completo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Turno</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Funciones</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Observaciones</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {funcionarios.map((func) => (
                    <tr key={func.cedula} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{func.cedula}</td>
                      <td className="px-4 py-3 text-sm">{func.nombreCompleto}</td>
                      <td className="px-4 py-3 text-sm">{func.turno}</td>
                      <td className="px-4 py-3 text-sm">{func.funciones}</td>
                      <td className="px-4 py-3 text-sm">{func.observaciones}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => abrirModal('funcionario', func)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarFuncionario(func.cedula)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {funcionarios.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No hay funcionarios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Módulo Turnos */}
        {activeTab === 'turnos' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Gestión de Turnos</h2>
              <button
                onClick={() => abrirModal('turno')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nuevo Turno
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre del Turno</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hora Entrada</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Salida Mañana</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Entrada Tarde</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Salida Final</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Recargo Nocturno</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {turnos.map((turno) => (
                    <tr key={turno.nombreTurno} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{turno.nombreTurno}</td>
                      <td className="px-4 py-3 text-sm">{turno.horaEntrada}</td>
                      <td className="px-4 py-3 text-sm">{turno.horaSalidaManana}</td>
                      <td className="px-4 py-3 text-sm">{turno.horaEntradaTarde}</td>
                      <td className="px-4 py-3 text-sm">{turno.horaSalidaFinal}</td>
                      <td className="px-4 py-3 text-sm">{turno.horasRecargoNocturno} hrs</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => abrirModal('turno', turno)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarTurno(turno.nombreTurno)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {turnos.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No hay turnos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Módulo Horarios */}
        {activeTab === 'horarios' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Asignación de Horarios</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportarExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Exportar Excel
                </button>
                <button
                  onClick={() => abrirModal('horario')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Horario
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funcionario</label>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filtros.funcionario}
                  onChange={(e) => setFiltros({...filtros, funcionario: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                <select
                  value={filtros.turno}
                  onChange={(e) => setFiltros({...filtros, turno: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {turnos.map(t => (
                    <option key={t.nombreTurno} value={t.nombreTurno}>{t.nombreTurno}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                <input
                  type="date"
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  type="date"
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Funcionario</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cédula</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Turno</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Desde</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hasta</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Jornada</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Recargo</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {horariosFiltrados.map((horario, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{horario.funcionarioNombre}</td>
                      <td className="px-4 py-3 text-sm">{horario.funcionarioCedula}</td>
                      <td className="px-4 py-3 text-sm">{horario.turnoNombre}</td>
                      <td className="px-4 py-3 text-sm">{horario.fechaDesde}</td>
                      <td className="px-4 py-3 text-sm">{horario.fechaHasta}</td>
                      <td className="px-4 py-3 text-sm text-xs">
                        {horario.turnoDetalle && (
                          <div>
                            <div>M: {horario.turnoDetalle.horaEntrada} - {horario.turnoDetalle.horaSalidaManana}</div>
                            <div>T: {horario.turnoDetalle.horaEntradaTarde} - {horario.turnoDetalle.horaSalidaFinal}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {horario.turnoDetalle?.horasRecargoNocturno || '0'} hrs
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => abrirModal('horario', horario)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarHorario(idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {horariosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        No hay horarios asignados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-red-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingItem ? 'Editar' : 'Nuevo'} {modalType === 'funcionario' ? 'Funcionario' : modalType === 'turno' ? 'Turno' : 'Horario'}
              </h3>
              <button onClick={cerrarModal} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {modalType === 'funcionario' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                    <input
                      type="text"
                      value={formData.cedula || ''}
                      onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      disabled={editingItem}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={formData.nombreCompleto || ''}
                      onChange={(e) => setFormData({...formData, nombreCompleto: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                    <select
                      value={formData.turno || ''}
                      onChange={(e) => setFormData({...formData, turno: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar turno</option>
                      {turnos.map(t => (
                        <option key={t.nombreTurno} value={t.nombreTurno}>{t.nombreTurno}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Funciones</label>
                    <textarea
                      value={formData.funciones || ''}
                      onChange={(e) => setFormData({...formData, funciones: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      rows="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                    <textarea
                      value={formData.observaciones || ''}
                      onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      rows="3"
                    />
                  </div>
                </div>
              )}

              {modalType === 'turno' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Turno</label>
                    <input
                      type="text"
                      value={formData.nombreTurno || ''}
                      onChange={(e) => setFormData({...formData, nombreTurno: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      disabled={editingItem}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora Entrada</label>
                      <input
                        type="time"
                        value={formData.horaEntrada || ''}
                        onChange={(e) => setFormData({...formData, horaEntrada: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora Salida Mañana</label>
                      <input
                        type="time"
                        value={formData.horaSalidaManana || ''}
                        onChange={(e) => setFormData({...formData, horaSalidaManana: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora Entrada Tarde</label>
                      <input
                        type="time"
                        value={formData.horaEntradaTarde || ''}
                        onChange={(e) => setFormData({...formData, horaEntradaTarde: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora Salida Final</label>
                      <input
                        type="time"
                        value={formData.horaSalidaFinal || ''}
                        onChange={(e) => setFormData({...formData, horaSalidaFinal: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horas de Recargo Nocturno</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.horasRecargoNocturno || ''}
                      onChange={(e) => setFormData({...formData, horasRecargoNocturno: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              {modalType === 'horario' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Funcionario</label>
                    <select
                      value={formData.funcionarioCedula || ''}
                      onChange={(e) => setFormData({...formData, funcionarioCedula: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar funcionario</option>
                      {funcionarios.map(f => (
                        <option key={f.cedula} value={f.cedula}>
                          {f.nombreCompleto} - {f.cedula}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                    <select
                      value={formData.turnoNombre || ''}
                      onChange={(e) => setFormData({...formData, turnoNombre: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar turno</option>
                      {turnos.map(t => (
                        <option key={t.nombreTurno} value={t.nombreTurno}>{t.nombreTurno}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                      <input
                        type="date"
                        value={formData.fechaDesde || ''}
                        onChange={(e) => setFormData({...formData, fechaDesde: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                      <input
                        type="date"
                        value={formData.fechaHasta || ''}
                        onChange={(e) => setFormData({...formData, fechaHasta: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={cerrarModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (modalType === 'funcionario') guardarFuncionario();
                    else if (modalType === 'turno') guardarTurno();
                    else if (modalType === 'horario') guardarHorario();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SistemaHorarios;