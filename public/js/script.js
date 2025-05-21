document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container");
  const registerBtn = document.getElementById("register");
  const loginBtn = document.getElementById("login");

  if (registerBtn && loginBtn && container) {
    // Alternar vista con click
    registerBtn.addEventListener("click", () =>
      container.classList.add("active")
    );

    loginBtn.addEventListener("click", () =>
      container.classList.remove("active")
    );

    // Alternar vista con Enter
    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        if (document.activeElement === registerBtn) {
          container.classList.add("active");
        } else if (document.activeElement === loginBtn) {
          container.classList.remove("active");
        }
      }
    });
  }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async function (e) {
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

    if (res.ok) {
      alert('Login exitoso');
      // Aquí rediriges a otra página si quieres: window.location.href = "/dashboard.html"
    } else {
      alert(data.mensaje || data.error || 'Error al iniciar sesión');
    }
  } catch (error) {
    console.error(error);
    alert('Error al conectar con el servidor');
  }
});

// Registro
document.getElementById('registerForm').addEventListener('submit', async function (e) {
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

    if (res.ok) {
      alert('Registro exitoso');
    } else {
      alert(data.mensaje || data.error || 'Error al registrar');
    }
  } catch (error) {
    console.error(error);
    alert('Error al conectar con el servidor');
  }
});

const recoverForm = document.querySelector('.form-container.recover form');
if (recoverForm) {
  recoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const email = form.querySelector('input[name="email"]').value;
    const newPassword = form.querySelector('input[name="password"]').value;
    const token = form.querySelector('input[name="token"]').value;


    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword })
      });
      const data = await res.json();

      if (res.ok) {
        alert('Contraseña recuperada exitosamente');
        // Puedes redirigir a login o donde quieras:
        // window.location.href = '/index.html';
      } else {
        alert(data.mensaje || data.error || 'Error al recuperar contraseña');
      }
    } catch (error) {
      console.error(error);
      alert('Error al conectar con el servidor');
    }
  });
}