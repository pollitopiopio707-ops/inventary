document.addEventListener("DOMContentLoaded", () => {
    // Seleccionamos todos los <li> que tengan la clase menu-item
    const menuItems = document.querySelectorAll(".menu-item");
    const sections = document.querySelectorAll(".content-section");
    const title = document.getElementById("section-title");

    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            // 1. Quitar la clase 'active' de todos los botones para que se apaguen
            menuItems.forEach(i => i.classList.remove("active"));
            // 2. Encender solo el botón al que le diste click
            item.classList.add("active");

            // 3. Ocultar todas las secciones de contenido
            sections.forEach(sec => sec.classList.remove("active"));

            // 4. Mostrar la sección que coincide con el 'data-section' del botón
            const sectionId = item.dataset.section;
            const targetSection = document.getElementById(sectionId);

            if (targetSection) {
                targetSection.classList.add("active");
                // 5. Actualizar el título del header con el texto del botón
                if (title) title.textContent = item.textContent.trim().toUpperCase();
            } else {
                console.error("No se encontró la sección con ID:", sectionId);
            }
        });
    });
});