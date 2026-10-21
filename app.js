import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, deleteDoc, doc 
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
            let listaBeneficios = plan.productosIncluidos.map(p => `<li style="margin-bottom:8px;">✔️ <strong>${p.cantidad}x</strong> ${p.nombreProd}</li>`).join('');

            gridMem.innerHTML += `
                <div class="card" style="border: 2px solid var(--warning); box-shadow: 0 10px 30px rgba(255, 179, 0, 0.1);">
                    <span class="badge" style="background: var(--warning); color: #000;">Suscripción</span>
                    <h3 style="margin: 0 0 5px 0; color: var(--warning); font-size: 1.6em; text-transform:uppercase;">${plan.nombre}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9em; margin-bottom: 20px; line-height:1.5;">${plan.descripcion}</p>
                    <div style="background: #0a0a0a; padding: 20px; border-radius: 12px; border: 1px solid #333; margin-bottom: 20px;">
                        <p style="margin:0 0 15px 0; color: white; font-weight:800; font-size:0.9em; text-transform:uppercase;">El plan incluye al mes:</p>
                        <ul style="margin:0; padding-left: 5px; font-size: 0.9em; list-style:none; color:#ccc;">
                            ${listaBeneficios}
                        </ul>
                    </div>
                    <div style="margin-top: auto; text-align: center;">
                        <p style="color: white; font-size: 2em; font-weight: 900; margin: 0 0 15px 0;">$${plan.precio}<span style="font-size:0.4em; color:#888;">/mes</span></p>
                        <button class="btn" style="background: var(--warning); color: #000; box-shadow: 0 5px 15px rgba(255,179,0,0.3);">Quiero este Plan</button>
                    </div>
                </div>
            `;
        });

        // NUEVO DISEÑO DE TARJETAS DE PRODUCTO (Problema de estiramiento solucionado)
        const snapProductos = await getDocs(productosCollection);
        gridMenu.innerHTML = ''; 
        snapProductos.forEach((doc) => {
            const prod = doc.data();
            gridMenu.innerHTML += `
                <div class="card">
                    <span class="badge">${prod.categoria}</span>
                    <img src="${prod.imagen}" alt="foto" class="card-img-top">
                    <h3 style="margin: 0 0 5px 0; font-size: 1.2em;">${prod.nombre}</h3>
                    <p style="color: var(--primary); font-size: 1.6em; font-weight: 900; margin: 0 0 15px 0;">$${prod.precio}</p>
                    <button class="btn" style="background: #222; border: 1px solid var(--primary); color:white;">Agregar al Carrito</button>
                </div>
            `;
        });
    } catch(err) {
        console.error("Error al cargar cliente:", err);
    }
}

// ==========================================
// ADMIN Y CREADOR DE MEMBRESÍAS
// ==========================================
window.imagenBase64 = "https://via.placeholder.com/300";

// Lógica de la cámara/galería con Vista Previa
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
            
            tabla.innerHTML += `
                <tr>
                    <td><img src="${prod.imagen}" style="width: 50px; height: 50px; border-radius:8px; object-fit:cover; border:1px solid #333;"></td>
                    <td><strong>${prod.nombre}</strong></td>
                    <td>${prod.stock}</td>
                    <td><strong style="color:var(--success);">$${prod.precio}</strong></td>
                    <td><button class="btn btn-eliminar" data-id="${docSnap.id}" style="background: #333; padding: 8px 12px; margin:0; font-size:0.8em;">X Borrar</button></td>
                </tr>
            `;

            divProductosCheck.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #222; padding: 10px 0;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; margin:0; text-transform:none; font-weight:normal;">
                        <input type="checkbox" class="check-prod-membresia" data-id="${docSnap.id}" data-nombre="${prod.nombre}" style="width:20px; margin:0;">
                        ${prod.nombre}
                    </label>
                    <input type="number" id="cant-${docSnap.id}" placeholder="Cant." style="width: 80px; padding: 8px; margin: 0; background: #111;" disabled>
                </div>
            `;
        });

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

        document.querySelectorAll('.check-prod-membresia').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const inputNum = document.getElementById(`cant-${e.target.dataset.id}`);
                inputNum.disabled = !e.target.checked;
                if(e.target.checked) { inputNum.value = 1; inputNum.focus(); }
                else inputNum.value = '';
            });
        });

    } catch (err) {
        console.error("Error Admin:", err);
    }
}

// ==========================================
// EVENTO: SUBIR PRODUCTO SUELTO
// ==========================================
document.getElementById('form-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(guardandoBloqueo) return; 
    toggleBloqueo(true);

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
        inicializarPanelAdmin(); 
        cargarVistaCliente(); 
        alert("¡Producto añadido exitosamente!");
    } catch (error) {
        alert("Error al subir. Revisa consola F12.");
    } finally {
        toggleBloqueo(false);
    }
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
        inicializarPanelAdmin(); 
        cargarVistaCliente(); 
        alert("¡Plan Mensual generado y publicado!");
    } catch (error) {
        alert("Error al crear plan.");
    } finally { toggleBloqueo(false); }
});

// ==========================================
// MÓDULO: PUNTO DE VENTA (POS)
// ==========================================
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
                // Tarjetas POS Compactas y Estéticas
                resultados.innerHTML += `
                    <div class="card" style="padding: 12px; border-color: ${prod.stock <= 0 ? '#ff2a2a' : '#2a2a2a'};">
                        <img src="${prod.imagen}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
                        <h4 style="margin: 0 0 5px 0; font-size: 1em; line-height:1.2;">${prod.nombre}</h4>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span style="font-size:0.8em; color:var(--text-muted)">Stock: <strong style="color:${prod.stock <= 0 ? 'var(--primary)' : 'white'}">${prod.stock}</strong></span>
                            <strong style="color:var(--success); font-size:1.1em;">$${prod.precio}</strong>
                        </div>
                        <button class="btn btn-success" style="padding: 10px; font-size: 0.8em; margin-top:auto;" ${prod.stock <= 0 ? 'disabled' : ''} 
                            onclick="alert('Cobro Procesado: $${prod.precio}')">
                            💰 Cobrar
                        </button>
                    </div>
                `;
            });
        }
        renderVentas();
        document.getElementById('buscador-pos').addEventListener('input', (e) => renderVentas(e.target.value));
    } catch(err) { console.error("Error POS:", err); }
}

window.addEventListener('cargarAdmin', inicializarPanelAdmin);
window.addEventListener('cargarPOS', cargarPOS);
document.addEventListener('DOMContentLoaded', cargarVistaCliente);