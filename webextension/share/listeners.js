const script = document.createElement('script');
script.type = 'text/javascript';
script.innerHTML = `
	var originalListener = document.addEventListener.bind(document);
	var listeners = {};
	document.addEventListener = function(type, cb, buble) {
	    var eventListeners = listeners[type] || [];
	    eventListeners.push(cb);
	    listeners[type] = eventListeners;
	    originalListener(type, cb, buble);
	    console.warn('listeners', listeners);
	};
	function getEvent(data) {
	    var result = {
	        target: document.activeElement,
	        _inherits_from_prototype: true,
	        defaultPrevented: false,
	        preventDefault: function() {}
	    };
	    for (var key in data) result[key] = data[key];
	    return result;
	}

	function runEvent(type, event) {
		console.warn('runEvent', type, event, listeners);
	    var eventListeners = listeners[type];
	    eventListeners && eventListeners.forEach(function(listener) {
	        listener(event);
	    });
	}

	document.addEventListener("clear-text", function(e) {
		console.warn('clear-text', e);
		runEvent("keydown", getEvent({
	        keyCode: 8,
	        which: 8,
	        charCode: 0,
	        type: "keydown"
	    }));
	});

	document.addEventListener("apply-text-by-paste", function(e) {
		console.warn('apply-text-by-paste', e);
	    runEvent("paste", getEvent({
	        clipboardData: {
	            getData: function() {
	                return e.detail || "";
	            },
	            items: [ "text/plain" ]
	        }
	 	}));
	});
`

document.documentElement.appendChild(script);