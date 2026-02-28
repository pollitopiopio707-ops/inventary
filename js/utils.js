function showMessage(containerId, message, type = 'success') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div class="message ${type}">${message}</div>`;

    if (type === 'success') {
        setTimeout(() => container.innerHTML = '', 4000);
    }
}

function setDefaultDates() {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    document.getElementById("fechaMov").valueAsDate = today;
    document.getElementById("fechaDesde").valueAsDate = monthAgo;
    document.getElementById("fechaHasta").valueAsDate = today;
}