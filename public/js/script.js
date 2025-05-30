document.addEventListener("DOMContentLoaded", () => {
    // ================== CÓDIGO PARA LOGIN/REGISTRO ==================
    const container = document.getElementById("container");
    const registerBtn = document.getElementById("register");
    const loginBtn = document.getElementById("login");

    if (registerBtn && loginBtn && container) {
        registerBtn.addEventListener("click", () => container.classList.add("active"));
        loginBtn.addEventListener("click", () => container.classList.remove("active"));

        document.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                if (document.activeElement === registerBtn) container.classList.add("active");
                else if (document.activeElement === loginBtn) container.classList.remove("active");
            }
        });
    }

    // ================== CÓDIGO PARA RECUPERAR CONTRASEÑA ==================
    const recoverForm = document.getElementById("recoverForm"); // Usamos el ID del formulario

    if (recoverForm) {
        recoverForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Formulario de recuperación enviado");

            const form = e.target;
            const email = form.querySelector('input[name="email"]').value;
            const newPassword = form.querySelector('input[name="password"]').value;
            const token = form.querySelector('input[name="token"]').value;

            // Convertir token vacío a null
            const tokenToSend = token.trim() === "" ? null : token;

            try {
                const res = await fetch("/api/recover", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, token: tokenToSend, newPassword }),
                });

                const data = await res.json();
                console.log("Respuesta del backend:", data);

                if (res.ok) {
                    alert(data.mensaje);
                    if (data.codigo === 11) form.reset();
                    else window.location.href = "/index.html";
                } else {
                    alert(data.mensaje || "Error al recuperar contraseña");
                }
            } catch (error) {
                console.error("Error:", error);
                alert("Error al conectar con el servidor");
            }
        });
    }
});

// ================== CÓDIGO PARA LOGIN (FUERA DE DOMContentLoaded) ==================
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = this.querySelector('input[name="email"]').value;
    const password = this.querySelector('input[name="password"]').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) alert('Login exitoso');
        else alert(data.mensaje || 'Error al iniciar sesión');

    } catch (error) {
        console.error(error);
        alert('Error al conectar con el servidor');
    }
});

// ================== CÓDIGO PARA REGISTRO (FUERA DE DOMContentLoaded) ==================
document.getElementById('registerForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = this.querySelector('input[name="email"]').value;
    const password = this.querySelector('input[name="password"]').value;

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) alert('Registro exitoso');
        else alert(data.mensaje || 'Error al registrar');

    } catch (error) {
        console.error(error);
        alert('Error al conectar con el servidor');
    }
});