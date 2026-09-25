const stages = [
	{ title: 'Pedido recibido', message: 'Estamos confirmando los detalles con la cocina.', icon: '✓' },
	{ title: 'Pedido en preparación', message: 'Nuestro equipo está preparando todo con cariño.', icon: '✦' },
	{ title: 'Pedido en camino', message: 'Tu repartidor ya salió. ¡Falta muy poco!', icon: '↗' },
	{ title: 'Pedido entregado', message: '¡Buen provecho! Gracias por pedir con Ritmo.', icon: '⌂' }
];

const startButton = document.querySelector('#startButton');
const resetButton = document.querySelector('#resetButton');
const countdown = document.querySelector('#countdown');
const liveStatus = document.querySelector('#liveStatus');
const progressBar = document.querySelector('#progressBar');
const stepElements = [...document.querySelectorAll('.step')];
let currentStage = 0;
let timerId;

function renderStage() {
	const stage = stages[currentStage];
	liveStatus.querySelector('.pulse-ring span').textContent = stage.icon;
	liveStatus.querySelector('strong').textContent = stage.title;
	liveStatus.querySelector('p').textContent = stage.message;
	progressBar.style.width = `${(currentStage / (stages.length - 1)) * 100}%`;
	stepElements.forEach((element, index) => {
		element.classList.toggle('active', index === currentStage);
		element.classList.toggle('done', index < currentStage);
	});
}

function updateCountdown(seconds) {
	countdown.textContent = String(seconds).padStart(2, '0');
}

function runStage() {
	let seconds = 5;
	updateCountdown(seconds);
	timerId = setInterval(() => {
		seconds -= 1;
		updateCountdown(seconds);
		if (seconds === 0) {
			clearInterval(timerId);
			if (currentStage < stages.length - 1) {
				currentStage += 1;
				renderStage();
				runStage();
			} else {
				startButton.hidden = true;
				resetButton.hidden = false;
				liveStatus.querySelector('.time-left').innerHTML = '<strong>✓</strong><span>listo</span>';
			}
		}
	}, 1000);
}

startButton.addEventListener('click', () => {
	startButton.disabled = true;
	startButton.innerHTML = '<span>●</span> Simulación en curso';
	runStage();
});

resetButton.addEventListener('click', () => {
	clearInterval(timerId);
	currentStage = 0;
	renderStage();
	startButton.hidden = false;
	startButton.disabled = false;
	startButton.innerHTML = '<span>▶</span> Iniciar simulación';
	resetButton.hidden = true;
	liveStatus.querySelector('.time-left').innerHTML = '<strong id="countdown">05</strong><span>seg</span>';
});
