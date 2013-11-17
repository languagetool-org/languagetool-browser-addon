window.addEventListener('click', function(event) {
	if(event.button==1) {
		self.port.emit('widgetOnMiddleClick');
	} else if(event.button==2) {
		self.port.emit('widgetOnRightClick');
	} else { 
		self.port.emit('widgetOnLeftClick');
	}
}, true);
