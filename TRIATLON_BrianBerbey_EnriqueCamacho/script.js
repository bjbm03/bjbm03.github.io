document.addEventListener('DOMContentLoaded', function() {
    let participantes = [];
    let intervalo;
    let horaInicioEvento = null;
    let eventoEnCurso = false;
    let tiempoTranscurrido = 0;
    let participantesActivos = [];
    let cronometroInterval = null;
    let cronometroSegundos = 0;
    let velocidadSimulacion = 1;
    let intervaloNormal;
    let intervaloSimulacion;
    let intervaloCronometro;
    
    const registrationForm = document.getElementById('registrationForm');
    const tablaRegistrados = document.getElementById('cuerpoTablaRegistrados');
    const tablaProgreso = document.getElementById('cuerpoTablaProgreso');
    const btnIniciar = document.getElementById('iniciarTriatlon');
    const btnPausar = document.getElementById('pausarTriatlon');
    const btnReiniciar = document.getElementById('reiniciarTriatlon');
    const btnTerminarDisciplina = document.getElementById('terminarDisciplina');
    const progresoGlobal = document.getElementById('progresoGlobal');
    const STORAGE_KEY = 'triatlonData';
    const navLinks = document.querySelectorAll('[data-section]');
    const sections = {
        home: document.getElementById('home-section'),
        registro: document.getElementById('registro-section'),
        lista: document.getElementById('lista-section'),
        triatlon: document.getElementById('triatlon-section')
    };
    const datosGuardados = localStorage.getItem(STORAGE_KEY);
    if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        if (datos.fechaEvento) {
            document.getElementById('fechaEvento').value = datos.fechaEvento;
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(nl => nl.classList.remove('active'));
            
            this.classList.add('active');
            
            Object.values(sections).forEach(section => {
                section.classList.add('d-none');
            });
            
            const sectionToShow = this.getAttribute('data-section');
            sections[sectionToShow].classList.remove('d-none');
        });
    });

    document.querySelector('[data-section="home"]').click();
    
    registrationForm.addEventListener('submit', registrarParticipante);
    btnIniciar.addEventListener('click', iniciarTriatlon);
    btnPausar.addEventListener('click', pausarTriatlon);
    btnReiniciar.addEventListener('click', reiniciarTriatlon);
    btnTerminarDisciplina.addEventListener('click', terminarDisciplinaActual);
    document.getElementById('toggleVelocidad').addEventListener('click', toggleVelocidad);
    document.getElementById('fechaEvento').min = getFechaActual();
    document.getElementById('seleccionarTodos').addEventListener('click', () => {
        const options = document.getElementById('selectParticipantes').options;
        for (let i = 0; i < options.length; i++) {
            options[i].selected = true;
        }
    });
    document.getElementById('deseleccionarTodos').addEventListener('click', () => {
        const options = document.getElementById('selectParticipantes').options;
        for (let i = 0; i < options.length; i++) {
            options[i].selected = false;
        }
    });
    
    function registrarParticipante(e) {
    e.preventDefault();
    
    const tipoCedula = document.getElementById('tipoCedula').value;
    const numeroCedula = document.getElementById('cedula').value;
    const nombre = document.getElementById('nombre').value;
    const municipio = document.getElementById('municipio').value;
    const edad = document.getElementById('edad').value;
    
    if (!tipoCedula || !numeroCedula) {
        alert('Por favor seleccione el tipo de cédula y complete el número');
        return;
    }
    
    if (!/^[0-9]{1,8}$/.test(numeroCedula)) {
        alert('El número de cédula debe contener solo dígitos (máximo 8)');
        return;
    }
    
    const cedulaCompleta = `${tipoCedula}-${numeroCedula.padStart(8, '0')}`;
    
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{5,}(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,})+$/.test(nombre)) {
        mostrarToast('Por favor ingrese un nombre completo válido (mínimo 2 nombres, solo letras)');
        return;
    }
    
    const edadNum = parseInt(edad);
    if (isNaN(edadNum) || edadNum < 18 || edadNum > 80) {
        mostrarToast('La edad debe estar entre 18 y 80 años');
        return;
    }
    
    if (!municipio) {
        mostrarToast('Por favor seleccione un municipio');
        return;
    }
    
    const nuevoParticipante = {
        cedula: cedulaCompleta,
        nombre,
        municipio,
        edad,
        registrado: true,
        descalificado: false,
        disciplinaActual: 'caminata',
        distanciaRecorridaCaminata: 0,
        distanciaRecorridaNatacion: 0,
        distanciaRecorridaCiclismo: 0,
        inicioCaminata: null,
        finCaminata: null,
        inicioNatacion: null,
        finNatacion: null,
        inicioCiclismo: null,
        finCiclismo: null,
        tiempoTotal: null
        };
    
    participantes.push(nuevoParticipante);
    actualizarTablaRegistrados();
    llenarSelectParticipantes();
    registrationForm.reset();
    actualizarContadorParticipantes();
    guardarDatos();
    
    mostrarToast(`Participante ${nombre} registrado correctamente.`);
    }
    
    function actualizarTablaRegistrados() {
        tablaRegistrados.innerHTML = '';
        
        participantes.forEach(participante => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${participante.cedula}</td>
                <td>${participante.nombre}</td>
                <td>${participante.municipio}</td>
                <td>${participante.edad}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="eliminarParticipante('${participante.cedula}')">
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                </td>
            `;
            tablaRegistrados.appendChild(fila);
        });
    }
    
    window.eliminarParticipante = function(cedula) {
        if (confirm('¿Está seguro que desea eliminar este participante?')) {
            participantes = participantes.filter(p => p.cedula !== cedula);
            participantesActivos = participantesActivos.filter(p => p.cedula !== cedula);
            actualizarTablaRegistrados();
            actualizarTablaProgreso();
            guardarDatos();
            mostrarToast('Participante eliminado correctamente');
        }
    }
    
    async function iniciarTriatlon() {
    const fechaValida = await validarFechaEvento();
    const horaInicio = document.getElementById('horaInicio').value;
    const select = document.getElementById('selectParticipantes');
    const participantesSeleccionados = Array.from(select.selectedOptions).map(opt => opt.value)

    if (!fechaValida) {
        return;
    }
    
    if (!horaInicio || !validarHora(horaInicio)) {
    alert('Por favor ingrese una hora válida en formato HH:MM:SS');
    return;
    }
    
    if (participantes.length === 0) {
    alert('No hay participantes registrados para iniciar el triatlón');
    return;
    }

    participantesActivos = JSON.parse(JSON.stringify(
        participantes.filter(p => participantesSeleccionados.includes(p.cedula))
    ));
    
    horaInicioEvento = horaInicio;
    eventoEnCurso = true;
    tiempoTranscurrido = 0;
    cronometroSegundos = 0;

    // Iniciar el cronómetro (solo aquí)
    iniciarCronometro();
    
    // Iniciar simulación (con su propio intervalo)
    reiniciarIntervalos();
    
    participantesActivos.forEach(p => {
    p.inicioCaminata = horaInicio;
    p.disciplinaActual = 'caminata';
    p.distanciaRecorridaCaminata = 0;
    p.distanciaRecorridaNatacion = 0;
    p.distanciaRecorridaCiclismo = 0;
    p.descalificado = false;
    });
    
    btnIniciar.disabled = true;
    btnPausar.disabled = false;
    document.getElementById('horaInicio').disabled = true;
    
    intervalo = setInterval(() => {
        actualizarProgreso();
        actualizarTablaProgreso();
    }, 1000/velocidadSimulacion);
    iniciarCronometro();
    guardarDatos();
    }
    
    function pausarTriatlon() {
        if (eventoEnCurso) {
            clearInterval(intervaloSimulacion);
            clearInterval(intervaloCronometro);
            eventoEnCurso = false;
            btnPausar.textContent = 'Continuar';
        } else {
            eventoEnCurso = true;
            btnPausar.textContent = 'Pausar';
            reiniciarIntervalos();
        }
        guardarDatos();
    }
    
    function reiniciarTriatlon() {
        // Limpiar intervalos
        clearInterval(intervaloSimulacion);
        clearInterval(intervaloCronometro);
        
        // Resetear variables de estado
        eventoEnCurso = false;
        horaInicioEvento = null;
        tiempoTranscurrido = 0;
        cronometroSegundos = 0;
        velocidadSimulacion = 1;
        
        // Resetear participantes activos
        participantesActivos = [];
        
        // Resetear UI
        btnIniciar.disabled = false;
        btnPausar.disabled = true;
        btnPausar.textContent = 'Pausar';
        document.getElementById('horaInicio').disabled = false;
        document.getElementById('horaInicio').value = ''; // Limpiar campo de hora
        
        // Limpiar visualizaciones
        tablaProgreso.innerHTML = '';
        progresoGlobal.style.width = '0%';
        progresoGlobal.textContent = '';
        
        // Reiniciar cronómetro
        reiniciarCronometro();
        
        // Actualizar botón de velocidad
        document.getElementById('toggleVelocidad').innerHTML = `<i class="bi bi-speedometer2"></i> Velocidad Normal (1X)`;
        
        // Forzar actualización del almacenamiento
        guardarDatos();
        
        // Limpiar datos específicos del evento
        localStorage.removeItem('cronometroTriatlon');
    }

    function terminarDisciplinaActual() {
        if (!eventoEnCurso) {
            alert('El triatlón no está en curso');
            return;
        }

        participantesActivos.forEach((participante, index) => {
            if (participante.descalificado || participante.disciplinaActual === 'completado') return;

            if (participante.disciplinaActual === 'caminata') {
                participante.distanciaRecorridaCaminata = 10000;
                participante.finCaminata = calcularHora(horaInicioEvento, tiempoTranscurrido);
                participante.inicioNatacion = participante.finCaminata;
                participante.disciplinaActual = 'natacion';
            } 
            else if (participante.disciplinaActual === 'natacion') {
                participante.distanciaRecorridaNatacion = 10000;
                participante.finNatacion = calcularHora(horaInicioEvento, tiempoTranscurrido);
                participante.inicioCiclismo = participante.finNatacion;
                participante.disciplinaActual = 'ciclismo';
            } 
            else if (participante.disciplinaActual === 'ciclismo') {
                participante.distanciaRecorridaCiclismo = 30000;
                participante.finCiclismo = calcularHora(horaInicioEvento, tiempoTranscurrido);
                participante.disciplinaActual = 'completado';
                participante.tiempoTotal = tiempoTranscurrido;
            }
        });

        actualizarTablaProgreso();
    }

    
    function actualizarProgreso() {
        if (!eventoEnCurso) return;
        tiempoTranscurrido += velocidadSimulacion; // Aumenta según la velocidad

        const totalDescalificados = participantesActivos.filter(p => p.descalificado).length;
    
        const ajustarVelocidad = totalDescalificados >= 2;

        participantesActivos.forEach((participante, index) => {
            if (participante.descalificado || participante.disciplinaActual === 'completado') return;
    
            const esPar = index % 2 === 0;
            const minSpeed = esPar ? (ajustarVelocidad ? 1 : 1) : 0;
            let distanciaRecorrida = 0;
            let velocidadMaxima = 0;
    
            if (participante.disciplinaActual === 'caminata') {
                // Velocidad de caminata: 7 km/h = ~1.944 m/s (máximo 3.888 m/s para variabilidad)
                velocidadMaxima = 1.944;
                distanciaRecorrida = (minSpeed + (Math.random() * (velocidadMaxima - minSpeed))) * velocidadSimulacion;
                
                // Solo verificar descalificación para participantes con minSpeed = 0
                if (!esPar && distanciaRecorrida < 1) {
                    if (totalDescalificados < 1) {
                        participante.descalificado = true;
                        console.log(`Descalificado: Participante ${index + 1} en caminata con ${distanciaRecorrida.toFixed(2)}m`);
                        return;
                    } else {
                        distanciaRecorrida = 1;
                    }
                }
                
                participante.distanciaRecorridaCaminata += distanciaRecorrida;
                
                // Verificar si completó la caminata (10 km = 10000 m)
                if (participante.distanciaRecorridaCaminata >= 10000) {
                    participante.finCaminata = calcularHora(horaInicioEvento, tiempoTranscurrido);
                    participante.inicioNatacion = participante.finCaminata;
                    participante.disciplinaActual = 'natacion';
                    console.log(`Participante ${index + 1} completó caminata en ${tiempoTranscurrido}s`);
                }
            } 
            else if (participante.disciplinaActual === 'natacion') {
                // Velocidad de natación: 1.72 m/s (máximo 3.44 m/s para variabilidad)
                velocidadMaxima = 1.72;
                distanciaRecorrida = (minSpeed + (Math.random() * (velocidadMaxima - minSpeed))) * velocidadSimulacion;
                
                if (!esPar && distanciaRecorrida < 1) {
                    if (totalDescalificados < 2) {
                        participante.descalificado = true;
                        console.log(`Descalificado: Participante ${index + 1} en caminata con ${distanciaRecorrida.toFixed(2)}m`);
                        return;
                    } else {
                        distanciaRecorrida = 1;
                    }
                }
                
                participante.distanciaRecorridaNatacion += distanciaRecorrida;
                
                // Verificar si completó la natación (10 km = 10000 m)
                if (participante.distanciaRecorridaNatacion >= 10000) {
                    participante.finNatacion = calcularHora(horaInicioEvento, tiempoTranscurrido);
                    participante.inicioCiclismo = participante.finNatacion;
                    participante.disciplinaActual = 'ciclismo';
                    console.log(`Participante ${index + 1} completó natación en ${tiempoTranscurrido}s`);
                }
            } 
            else if (participante.disciplinaActual === 'ciclismo') {
                // Velocidad de ciclismo: 45 km/h = 12.5 m/s (máximo 25 m/s para variabilidad)
                velocidadMaxima = 12.5;
                distanciaRecorrida = (minSpeed + (Math.random() * (velocidadMaxima - minSpeed))) * velocidadSimulacion;
                
                if (!esPar && distanciaRecorrida < 1) {
                    if (totalDescalificados < 2) {
                        participante.descalificado = true;
                        console.log(`Descalificado: Participante ${index + 1} en caminata con ${distanciaRecorrida.toFixed(2)}m`);
                        return;
                    } else {
                        distanciaRecorrida = 1;
                    }
                }
                
                participante.distanciaRecorridaCiclismo += distanciaRecorrida;
                
                // Verificar si completó el ciclismo (30 km = 30000 m)
                if (participante.distanciaRecorridaCiclismo >= 30000) {
                    participante.finCiclismo = calcularHora(horaInicioEvento, tiempoTranscurrido);
                    participante.disciplinaActual = 'completado';
                    participante.tiempoTotal = tiempoTranscurrido;
                    console.log(`Participante ${index + 1} completó el triatlón en ${tiempoTranscurrido}s`);
                }
            }
            console.log(`Participante ${index} - minSpeed: ${minSpeed} - distancia: ${distanciaRecorrida}`);
            guardarDatos();
        });
    
        actualizarTablaProgreso();
        
        const completados = participantesActivos.filter(p => p.disciplinaActual === 'completado').length;
        const porcentaje = (completados / participantesActivos.length) * 100;
        progresoGlobal.style.width = `${porcentaje}%`;
        progresoGlobal.textContent = `${Math.round(porcentaje)}% completado`;
    }
    
    function actualizarTablaProgreso() {
    tablaProgreso.innerHTML = '';
    
    const tiempoActual = tiempoTranscurrido;
    
    const participantesOrdenados = [...participantesActivos].sort((a, b) => {
    
    if (a.descalificado && !b.descalificado) return 1;
    if (!a.descalificado && b.descalificado) return -1;
    
    if (a.descalificado && b.descalificado) return 0;
    
    if (a.disciplinaActual === 'completado' && b.disciplinaActual === 'completado') {
    return a.tiempoTotal - b.tiempoTotal;
    }
    
    if (a.disciplinaActual === 'completado') return -1;
    if (b.disciplinaActual === 'completado') return 1;
    
    const ordenDisciplinas = { 'caminata': 1, 'natacion': 2, 'ciclismo': 3 };
    if (ordenDisciplinas[a.disciplinaActual] > ordenDisciplinas[b.disciplinaActual]) return -1;
    if (ordenDisciplinas[a.disciplinaActual] < ordenDisciplinas[b.disciplinaActual]) return 1;
    
    if (a.disciplinaActual === 'caminata') {
    return b.distanciaRecorridaCaminata - a.distanciaRecorridaCaminata;
    } else if (a.disciplinaActual === 'natacion') {
    return b.distanciaRecorridaNatacion - a.distanciaRecorridaNatacion;
    } else {
    return b.distanciaRecorridaCiclismo - a.distanciaRecorridaCiclismo;
    }
    });
    
    participantesOrdenados.forEach((participante, index) => {
        const fila = document.createElement('tr');
        
        if (participante.descalificado) {
            fila.classList.add('disqualified');
        } else if (participante.disciplinaActual === 'completado') {
            fila.classList.add('completed');
        }
        
        const segundosDesdeInicioCaminata = tiempoActual - getSecondsFromHora(participante.inicioCaminata);
        const tiempoCaminata = participante.finCaminata || 
            (participante.disciplinaActual === 'caminata' && segundosDesdeInicioCaminata >= 0 ? 
                calcularHora(participante.inicioCaminata, segundosDesdeInicioCaminata) : 
                '-');
        
        const segundosDesdeInicioNatacion = tiempoActual - getSecondsFromHora(participante.inicioNatacion);
        const tiempoNatacion = participante.finNatacion || 
            (participante.disciplinaActual === 'natacion' && segundosDesdeInicioNatacion >= 0 ? 
                calcularHora(participante.inicioNatacion, segundosDesdeInicioNatacion) : 
                '-');
        
        const segundosDesdeInicioCiclismo = tiempoActual - getSecondsFromHora(participante.inicioCiclismo);
        const tiempoCiclismo = participante.finCiclismo || 
            (participante.disciplinaActual === 'ciclismo' && segundosDesdeInicioCiclismo >= 0 ? 
                calcularHora(participante.inicioCiclismo, segundosDesdeInicioCiclismo) : 
                '-');
        
        let distanciaFaltante = '-';
        let estadoConDistancia = '-';
        
        if (!participante.descalificado) {
            if (participante.disciplinaActual === 'completado') {
                estadoConDistancia = 'Completado';
                distanciaFaltante = '0m';
            } else if (participante.disciplinaActual === 'caminata') {
                estadoConDistancia = `Caminata: ${participante.distanciaRecorridaCaminata.toFixed(0)}m`;
                distanciaFaltante = `${(10000 - participante.distanciaRecorridaCaminata).toFixed(0)}m`;
            } else if (participante.disciplinaActual === 'natacion') {
                estadoConDistancia = `Natación: ${participante.distanciaRecorridaNatacion.toFixed(0)}m`;
                distanciaFaltante = `${(10000 - participante.distanciaRecorridaNatacion).toFixed(0)}m`;
            } else if (participante.disciplinaActual === 'ciclismo') {
                estadoConDistancia = `Ciclismo: ${participante.distanciaRecorridaCiclismo.toFixed(0)}m`;
                distanciaFaltante = `${(30000 - participante.distanciaRecorridaCiclismo).toFixed(0)}m`;
            }
        } else {
            estadoConDistancia = 'Descalificado';
        }
        
        fila.innerHTML = `
            <td>${index + 1}</td>
            <td>${participante.nombre}</td>
            <td>${participante.cedula}</td>
            <td>${participante.municipio}</td>
            <td>${participante.edad}</td>
            <td>${participante.inicioCaminata || '-'}</td>
            <td>${tiempoCaminata}</td>
            <td>${participante.inicioNatacion || '-'}</td>
            <td>${tiempoNatacion}</td>
            <td>${participante.inicioCiclismo || '-'}</td>
            <td>${tiempoCiclismo}</td>
            <td>${participante.tiempoTotal ? formatTiempo(participante.tiempoTotal) : '-'}</td>
            <td>${distanciaFaltante}</td>
            <td>${estadoConDistancia}</td>
        `;
        
        tablaProgreso.appendChild(fila);
    });
}

    
    // Función auxiliar para validar formato de hora
    function validarHora(hora) {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    return regex.test(hora);
    }

    // Función auxiliar para calcular una hora sumando segundos
    function calcularHora(horaInicio, segundosTranscurridos) {
        if (!horaInicio || segundosTranscurridos < 0) {
            return horaInicio || '00:00:00';
        }
        
        let [h, m, s] = horaInicio.split(':').map(Number);
        
        const totalSegundos = h * 3600 + m * 60 + s + segundosTranscurridos;
        
        const nuevasHoras = Math.floor(totalSegundos / 3600) % 24;
        const nuevosMinutos = Math.floor((totalSegundos % 3600) / 60);
        const nuevosSegundos = totalSegundos % 60;
        
        return `${String(nuevasHoras).padStart(2, '0')}:${String(nuevosMinutos).padStart(2, '0')}:${String(nuevosSegundos).padStart(2, '0')}`;
    }
    
    // Función auxiliar para formatear segundos a HH:MM:SS
    function formatTiempo(segundos) {
        if (segundos < 0) return '00:00:00';
        
        const h = Math.floor(segundos / 3600);
        const m = Math.floor((segundos % 3600) / 60);
        const s = segundos % 60;
        
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    
    // Función auxiliar para convertir HH:MM:SS a segundos
    function getSecondsFromHora(hora) {
        if (!hora || hora === '-' || hora === '00:00:00') return 0;
        
        const [h, m, s] = hora.split(':').map(Number);
        return h * 3600 + m * 60 + s;
    }
    
    function mostrarToast(mensaje) {
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.innerHTML = `
            <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header bg-success text-white">
                    <strong class="me-auto">Notificación</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${mensaje}
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function cargarDatos() {
        const datosGuardados = localStorage.getItem(STORAGE_KEY);
        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            participantes = datos.participantes || [];
            participantesActivos = datos.participantesActivos || [];
            horaInicioEvento = datos.horaInicioEvento || null;
            eventoEnCurso = datos.eventoEnCurso || false;
            tiempoTranscurrido = datos.tiempoTranscurrido || 0;
            
            const tiempoCronometro = localStorage.getItem('cronometroTriatlon');
            if (tiempoCronometro) {
                cronometroSegundos = parseInt(tiempoCronometro);
                actualizarCronometro();
            }
            
            if (eventoEnCurso) {
                btnIniciar.disabled = true;
                btnPausar.disabled = false;
                document.getElementById('horaInicio').disabled = true;
                intervalo = setInterval(actualizarProgreso, 1000);
                iniciarCronometro();
            }

            if (datos.participantesSeleccionados) {
                const select = document.getElementById('selectParticipantes');
                const options = select.options;
                
                for (let i = 0; i < options.length; i++) {
                    options[i].selected = datos.participantesSeleccionados.includes(options[i].value);
                }
            }
        }
        actualizarTablaRegistrados();
        actualizarTablaProgreso();
    }

    function guardarDatos() {
         // Guardar selección actual de participantes
        const select = document.getElementById('selectParticipantes');
        const participantesSeleccionados = Array.from(select.selectedOptions).map(opt => opt.value);
        const datos = {
            participantes,
            participantesActivos,
            horaInicioEvento,
            eventoEnCurso,
            tiempoTranscurrido,
            cronometroSegundos,
            velocidadSimulacion,
            fechaEvento: document.getElementById('fechaEvento').value,
            participantesSeleccionados
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    }
    document.getElementById('limpiarStorage').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    });

    function iniciarCronometro() {
        // Limpiar cualquier intervalo existente primero
        detenerCronometro();
        
        // Cargar tiempo guardado o empezar desde 0
        const tiempoGuardado = localStorage.getItem('cronometroTriatlon');
        cronometroSegundos = tiempoGuardado ? parseInt(tiempoGuardado) : 0;
        
        // Actualizar visualización inmediatamente
        actualizarCronometro();
        
        // Iniciar nuevo intervalo (asegurarse que solo hay uno)
        cronometroInterval = setInterval(actualizarCronometro, 1000);
    }

    function actualizarCronometro() {
        // Verificar si el evento está activo
        if (!eventoEnCurso) return;
        
        // Incrementar solo 1 segundo
        cronometroSegundos += 1;
        
        // Actualizar almacenamiento
        localStorage.setItem('cronometroTriatlon', cronometroSegundos.toString());
        
        // Formatear y mostrar el tiempo
        const horas = Math.floor(cronometroSegundos / 3600);
        const minutos = Math.floor((cronometroSegundos % 3600) / 60);
        const segundos = cronometroSegundos % 60;
        
        document.getElementById('cronometroDisplay').textContent = 
            `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }
    

    function detenerCronometro() {
        if (cronometroInterval) {
            clearInterval(cronometroInterval);
            cronometroInterval = null;
        }
    }

    function reiniciarCronometro() {
        detenerCronometro();
        cronometroSegundos = 0;
        document.getElementById('cronometroDisplay').textContent = '00:00:00';
        localStorage.removeItem('cronometroTriatlon');
    }
    function actualizarContadorParticipantes() {
        document.getElementById('participant-count').textContent = participantes.length;
    }
    function toggleVelocidad() {
        velocidadSimulacion = velocidadSimulacion === 1 ? 10 : 1;
        
        // Actualizar texto del botón
        const btn = document.getElementById('toggleVelocidad');
        btn.innerHTML = `<i class="bi bi-speedometer2"></i> Velocidad ${velocidadSimulacion === 1 ? 'Normal' : 'Rápida'} (${velocidadSimulacion}X)`;
        
        // Reiniciar los intervalos si el evento está en curso
        if (eventoEnCurso) {
            reiniciarIntervalos();
        }
    }
    
    // Función para reiniciar intervalos (nueva)
    function reiniciarIntervalos() {
        // Limpiar solo el intervalo de simulación
        clearInterval(intervaloSimulacion);
        
        if (eventoEnCurso) {
            // Solo manejar el intervalo de simulación
            intervaloSimulacion = setInterval(() => {
                actualizarProgreso();
                actualizarTablaProgreso();
            }, 1000 / velocidadSimulacion);
        }
    }
    function validarFechaEvento() {
        const fechaInput = document.getElementById('fechaEvento').value;
        if (!fechaInput) {
            mostrarToast('Por favor seleccione una fecha para el evento', 'error');
            return false;
        }
        
        const fechaEvento = new Date(fechaInput);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Ignorar la hora para comparar solo fechas
        
        if (fechaEvento < hoy) {
            return true; // Fecha pasada es válida
        } else if (fechaEvento > hoy) {
            return confirmarFechaFutura();
        }
        
        return true; // Fecha actual
    }
    // Función para confirmar fecha futura
    function confirmarFechaFutura() {
        return new Promise((resolve) => {
            // Crear modal de confirmación
            const modalHTML = `
                <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-warning">
                                <h5 class="modal-title">Confirmar fecha futura</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p>¿Está seguro que desea programar el evento para una fecha futura?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
                                <button type="button" class="btn btn-primary" id="confirmYes">Sí</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Añadir modal al body
            const modalDiv = document.createElement('div');
            modalDiv.innerHTML = modalHTML;
            document.body.appendChild(modalDiv);
            
            const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
            modal.show();
            
            // Manejar confirmación
            document.getElementById('confirmYes').addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            
            // Manejar cierre del modal
            document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modalDiv);
                resolve(false);
            });
        });
    }
    function getFechaActual() {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
    // Función para llenar el select de participantes
function llenarSelectParticipantes() {
    const select = document.getElementById('selectParticipantes');
    select.innerHTML = '';
    
    participantes.forEach(participante => {
        const option = document.createElement('option');
        option.value = participante.cedula;
        option.textContent = `${participante.nombre} (${participante.cedula}) - ${participante.municipio}`;
        option.selected = true; // Todos seleccionados por defecto
        select.appendChild(option);
    });
}
    cargarDatos();
    llenarSelectParticipantes();
});

