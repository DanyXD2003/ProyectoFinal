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
