

const pdfViewerHandler = () => {
	const oUrlParams = new URLSearchParams(window.location.search);
	const sUrlOrigin = window.location.origin;
	const sPath = oUrlParams.get('path');
	if (sPath) {
		window.location.href = `${sUrlOrigin}${sPath}`;
		return;
	}
	const oMessage = document.querySelector('.message');
	oMessage.style.display = 'block';
};

pdfViewerHandler();