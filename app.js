import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAKtHeEuIBZ3B9qDU1BEbhHgUbAWLCyOas",
    authDomain: "metal-supplements.firebaseapp.com",
    projectId: "metal-supplements",
    storageBucket: "metal-supplements.firebasestorage.app",
    messagingSenderId: "658906204677",
    appId: "1:658906204677:web:0cde8ebdf5a083ef37ea6c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const productosCollection = collection(db, "productos");
const membresiasCollection = collection(db, "membresias");
const ventasCollection = collection(db, "ventas"); 

let inventarioGlobal = []; 
let guardandoBloqueo = false; 

function toggleBloqueo(activo) {
    guardandoBloqueo = activo;
    const overlay = document.getElementById('ui-bloqueo');
    if(activo) overlay.classList.remove('oculto');
    else overlay.classList.add('oculto');
}

// ==========================================
// VISTA CLIENTE (Pública)
// ==========================================
async function cargarVistaCliente() {
    const gridMem = document.getElementById('membresias-grid');
    gridMem.innerHTML = '<p style="color:var(--text-muted); padding:20px;">Cargando planes...</p>';
    
    const gridMenu = document.getElementById('menu-grid');
    gridMenu.innerHTML = '<p style="color:var(--text-muted); padding:20px;">Cargando menú digital...</p>';

    try {
        const snapMembresias = await getDocs(membresiasCollection);
        gridMem.innerHTML = '';
        snapMembresias.forEach(doc => {
            const plan = doc.data();
            let listaBeneficios = plan.productosIncluidos.map(p => `
                <li style="margin-bottom:12px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #222; padding-bottom:8px;">
                    <img src="${p.imagenProd}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid #444;">
                    <span style="color:white; font-size:1.1em;"><strong>${p.cantidad}x</strong> ${p.nombreProd}</span>
                </li>`).join('');

            gridMem.innerHTML += `
                <div class="card" style="border: 2px solid var(--warning); box-shadow: 0 10px 30px rgba(255, 179, 0, 0.1);">
                    <span class="badge" style="background: var(--warning); color: #000;">Suscripción</span>
                    <h3 style="margin: 0 0 5px 0; color: var(--warning); font-size: 1.8em; text-transform:uppercase;">${plan.nombre}</h3>
                    <p style="color: var(--text-muted); font-size: 0.95em; margin-bottom: 25px; line-height:1.5;">${plan.descripcion}</p>
                    <div style="background: #0a0a0a; padding: 20px; border-radius: 12px; border: 1px solid #333; margin-bottom: 25px;">
                        <p style="margin:0 0 15px 0; color: var(--warning); font-weight:800; font-size:0.9em; text-transform:uppercase;">Beneficios del mes:</p>
                        <ul style="margin:0; padding: 0; list-style:none;">
                            ${listaBeneficios}
                        </ul>
                    </div>
                    <div style="margin-top: auto; text-align: center;">
                        <p style="color: white; font-size: 2.2em; font-weight: 900; margin: 0 0 15px 0;">$${plan.precio}<span style="font-size:0.4em; color:#888;">/mes</span></p>
                        <button class="btn" style="background: var(--warning); color: #000; box-shadow: 0 5px 15px rgba(255,179,0,0.3);">Quiero este Plan</button>
                    </div>
                </div>
            `;
        });

        const snapProductos = await getDocs(productosCollection);
        gridMenu.innerHTML = ''; 
        snapProductos.forEach((doc) => {
            const prod = doc.data();
            gridMenu.innerHTML += `
                <div class="card">
                    <span class="badge">${prod.categoria}</span>
                    <img src="${prod.imagen}" alt="foto" class="card-img-top">
                    <h3 style="margin: 0 0 5px 0; font-size: 1.3em;">${prod.nombre}</h3>
                    <p style="color: var(--primary); font-size: 1.8em; font-weight: 900; margin: 0 0 20px 0;">$${prod.precio}</p>
                    <button class="btn" style="background: #222; border: 1px solid var(--primary); color:white;">Agregar al Carrito</button>
                </div>
            `;
        });
    } catch(err) { console.error(err); }
}

// ==========================================
// ADMIN: FOTO Y CARGA INICIAL
// ==========================================
window.imagenBase64 = "https://via.placeholder.com/300";

document.getElementById('imagen-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if(file.size > 2097152) { alert("Foto muy pesada (Max 2MB)."); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (evento) => { 
            window.imagenBase64 = evento.target.result; 
            const preview = document.getElementById('preview-foto');
            preview.src = window.imagenBase64;
            preview.classList.remove('oculto');
        };
        reader.readAsDataURL(file);
    }
});

async function inicializarPanelAdmin() {
    const tabla = document.getElementById('tabla-admin');
    tabla.innerHTML = '<tr><td colspan="5">Cargando datos...</td></tr>';
    
    const divProductosCheck = document.getElementById('lista-productos-check');
    divProductosCheck.innerHTML = '';

    try {
        const querySnapshot = await getDocs(productosCollection);
        tabla.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            
            // Tabla de inventario
            tabla.innerHTML += `
                <tr>
                    <td><img src="${prod.imagen}" style="width: 50px; height: 50px; border-radius:8px; object-fit:cover; border:1px solid #333;"></td>
                    <td><strong style="font-size:1.1em;">${prod.nombre}</strong><br><small style="color:#666;">${prod.categoria}</small></td>
                    <td>${prod.stock} pzas</td>
                    <td><strong style="color:var(--success); font-size:1.1em;">$${prod.precio}</strong></td>
                    <td><button class="btn btn-eliminar" data-id="${docSnap.id}" style="background: #333; padding: 8px 12px; margin:0; font-size:0.8em;">X Borrar</button></td>
                </tr>
            `;

            // Checkbox con Imagen para Membresías
            divProductosCheck.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #222; padding: 10px 0;">
                    <label style="display: flex; align-items: center; cursor: pointer; flex: 1; margin:0; text-transform:none; font-weight:normal; color:white; font-size:1.1em;">
                        <input type="checkbox" class="check-prod-membresia" data-id="${docSnap.id}" data-nombre="${prod.nombre}" data-img="${prod.imagen}" style="width:22px; height:22px; margin:0 15px 0 0;">
                        <img src="${prod.imagen}" style="width: 45px; height: 45px; border-radius: 8px; object-fit: cover; margin-right: 15px; border: 1px solid #444;">
                        ${prod.nombre}
                    </label>
                    <input type="number" id="cant-${docSnap.id}" placeholder="Cant." style="width: 80px; padding: 10px; margin: 0; background: #111; text-align:center; font-size:1.1em;" disabled>
                </div>
            `;
        });

        // Lógica Eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm("¿Eliminar producto permanentemente?")) {
                    toggleBloqueo(true);
                    try {
                        await deleteDoc(doc(db, "productos", e.target.getAttribute('data-id')));
                        inicializarPanelAdmin();
                    } finally { toggleBloqueo(false); }
                }
            });
        });

        // Lógica Checkbox
        document.querySelectorAll('.check-prod-membresia').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const inputNum = document.getElementById(`cant-${e.target.dataset.id}`);
                inputNum.disabled = !e.target.checked;
                if(e.target.checked) { inputNum.value = 1; inputNum.focus(); }
                else inputNum.value = '';
            });
        });

    } catch (err) { console.error("Error Admin:", err); }
}

// ==========================================
// EVENTO: SUBIR PRODUCTO 
// ==========================================
document.getElementById('form-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(guardandoBloqueo) return; toggleBloqueo(true);

    const nuevoProducto = {
        nombre: document.getElementById('nombre').value,
        categoria: document.getElementById('categoria').value,
        costo: Math.round(parseFloat(document.getElementById('costo').value) * 100) / 100,
        precio: Math.round(parseFloat(document.getElementById('precio').value) * 100) / 100,
        stock: parseInt(document.getElementById('stock').value),
        imagen: window.imagenBase64,
        fecha: new Date().toISOString()
    };
    
    try {
        await addDoc(productosCollection, nuevoProducto);
        document.getElementById('form-admin').reset();
        document.getElementById('preview-foto').classList.add('oculto');
        window.imagenBase64 = "https://via.placeholder.com/300";
        inicializarPanelAdmin(); cargarVistaCliente(); 
        alert("¡Producto añadido exitosamente!");
    } catch (error) { alert("Error al subir."); } 
    finally { toggleBloqueo(false); }
});

// ==========================================
// EVENTO: CREAR MEMBRESÍA
// ==========================================
document.getElementById('form-membresia').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(guardandoBloqueo) return;
    
    let productosSeleccionados = [];
    document.querySelectorAll('.check-prod-membresia:checked').forEach(chk => {
        productosSeleccionados.push({
            productoId: chk.dataset.id,
            nombreProd: chk.dataset.nombre,
            imagenProd: chk.dataset.img, 
            cantidad: parseInt(document.getElementById(`cant-${chk.dataset.id}`).value) || 1
        });
    });

    if(productosSeleccionados.length === 0) { alert("Selecciona mínimo 1 producto para armar el plan."); return; }

    toggleBloqueo(true);
    const nuevaMembresia = {
        nombre: document.getElementById('mem-nombre').value,
        precio: Math.round(parseFloat(document.getElementById('mem-precio').value) * 100) / 100,
        descripcion: document.getElementById('mem-desc').value,
        productosIncluidos: productosSeleccionados,
        fechaAlta: new Date().toISOString()
    };

    try {
        await addDoc(membresiasCollection, nuevaMembresia);
        document.getElementById('form-membresia').reset();
        inicializarPanelAdmin(); cargarVistaCliente(); 
        alert("¡Plan Mensual generado y publicado!");
    } catch (error) { alert("Error al crear plan."); } 
    finally { toggleBloqueo(false); }
});

// ==========================================
// MÓDULO: PUNTO DE VENTA (POS) CON REGISTRO
// ==========================================
window.procesarVenta = async function(idProd, nombre, precio, stockActual) {
    if(guardandoBloqueo) return; toggleBloqueo(true);
    try {
        await updateDoc(doc(db, "productos", idProd), { stock: stockActual - 1 });
        await addDoc(ventasCollection, {
            productoId: idProd,
            nombre: nombre,
            precio: precio,
            fecha: new Date().toISOString()
        });
        alert(`¡Cobro Procesado de: ${nombre}!`);
        cargarPOS(); 
    } catch (e) { alert("Error en la venta: " + e.message); }
    finally { toggleBloqueo(false); }
}

async function cargarPOS() {
    const resultados = document.getElementById('resultados-pos');
    inventarioGlobal = []; 
    try {
        const querySnapshot = await getDocs(productosCollection);
        querySnapshot.forEach(docSnap => inventarioGlobal.push({ id: docSnap.id, ...docSnap.data() }));

        const renderVentas = (filtro = "") => {
            resultados.innerHTML = "";
            const filtrados = inventarioGlobal.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()));
            
            filtrados.forEach(prod => {
                resultados.innerHTML += `
                    <div class="card" style="padding: 15px; border-color: ${prod.stock <= 0 ? '#ff2a2a' : '#2a2a2a'};">
                        <img src="${prod.imagen}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">
                        <h4 style="margin: 0 0 5px 0; font-size: 1.1em; line-height:1.2;">${prod.nombre}</h4>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <span style="font-size:0.85em; color:var(--text-muted)">Stock: <strong style="color:${prod.stock <= 0 ? 'var(--primary)' : 'white'}">${prod.stock}</strong></span>
                            <strong style="color:var(--success); font-size:1.3em;">$${prod.precio}</strong>
                        </div>
                        <button class="btn btn-success" style="padding: 12px; font-size: 0.9em; margin-top:auto;" ${prod.stock <= 0 ? 'disabled' : ''} 
                            onclick="procesarVenta('${prod.id}', '${prod.nombre}', ${prod.precio}, ${prod.stock})">
                            💰 Vender 1 pza
                        </button>
                    </div>
                `;
            });
        }
        renderVentas();
        document.getElementById('buscador-pos').addEventListener('input', (e) => renderVentas(e.target.value));
    } catch(err) { console.error(err); }
}

// ==========================================
// MÓDULO: ESTADÍSTICAS
// ==========================================
async function cargarEstadisticas() {
    try {
        const snap = await getDocs(ventasCollection);
        
        if (snap.empty) {
            const msjVacio = "<p style='color:#666; font-size:0.9em; font-style:italic;'>Aún no hay ventas registradas.</p>";
            document.getElementById('stats-hoy').innerHTML = msjVacio;
            document.getElementById('stats-semana').innerHTML = msjVacio;
            document.getElementById('stats-mes').innerHTML = msjVacio;
            document.getElementById('stats-menos-vendidos').innerHTML = msjVacio;
            return;
        }

        let ventasDiarias = {}; let ventasSemanales = {}; let ventasMensuales = {}; let totales = {};

        const ahora = new Date();
        const hoyStr = ahora.toISOString().split('T')[0];
        const hace7Dias = new Date(); hace7Dias.setDate(ahora.getDate() - 7);
        const hace30Dias = new Date(); hace30Dias.setDate(ahora.getDate() - 30);

        snap.forEach(d => {
            const v = d.data();
            const fechaVenta = new Date(v.fecha);
            const fechaStr = v.fecha.split('T')[0];

            if(!totales[v.nombre]) totales[v.nombre] = 0;
            totales[v.nombre]++;

            if(fechaStr === hoyStr) {
                if(!ventasDiarias[v.nombre]) ventasDiarias[v.nombre] = 0;
                ventasDiarias[v.nombre]++;
            }
            if(fechaVenta >= hace7Dias) {
                if(!ventasSemanales[v.nombre]) ventasSemanales[v.nombre] = 0;
                ventasSemanales[v.nombre]++;
            }
            if(fechaVenta >= hace30Dias) {
                if(!ventasMensuales[v.nombre]) ventasMensuales[v.nombre] = 0;
                ventasMensuales[v.nombre]++;
            }
        });

        const renderRank = (objeto, max, desc = true) => {
            let arr = Object.keys(objeto).map(nombre => ({ nombre, cant: objeto[nombre] }));
            if(arr.length === 0) return "<p style='color:#666; font-size:0.9em; font-style:italic;'>Sin ventas en este periodo.</p>";
            
            arr.sort((a,b) => desc ? b.cant - a.cant : a.cant - b.cant); 
            return arr.slice(0, max).map(i => `
                <div class="stat-row">
                    <span>${i.nombre}</span>
                    <strong style="color: white; background: #333; padding: 4px 10px; border-radius: 6px;">${i.cant} pzas</strong>
                </div>
            `).join('');
        };

        document.getElementById('stats-hoy').innerHTML = renderRank(ventasDiarias, 3);
        document.getElementById('stats-semana').innerHTML = renderRank(ventasSemanales, 3);
        document.getElementById('stats-mes').innerHTML = renderRank(ventasMensuales, 3);
        document.getElementById('stats-menos-vendidos').innerHTML = renderRank(totales, 5, false);

    } catch (err) { 
        console.error("Error Estadísticas:", err); 
        document.getElementById('stats-hoy').innerHTML = "<p style='color:red;'>Error de conexión.</p>";
    }
}

window.addEventListener('cargarAdmin', inicializarPanelAdmin);
window.addEventListener('cargarPOS', cargarPOS);
window.addEventListener('cargarEstadisticas', cargarEstadisticas);
document.addEventListener('DOMContentLoaded', cargarVistaCliente);