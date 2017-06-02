# liquid.js
Liquid Web application framework
 
### Installation

Make sure that node.js (minimum version **v6.6.0**) and npm (minimum version **v3.10.9**) are installed on your computer.
	
	node --version
	npm --version

If you do not have them installed, you can find the install packages here: https://nodejs.org/it/

After you checkout the folder you have to install the dependencies. The automatic installation requires bower:

	npm install -g bower

Once you installed bower:	
	
	npm install
	
Finally you can start liquid.js
	
	npm start

---

### Configuration of liquid.js server side

The folder **applicationTemplate** already contains the 
You can create your own application folder complying with the following skeleton:

	----- application
	  
	  ┖ ----- public
	  	┖ ----- components
		 		┖ ----- Your liquid-component.*.html files
	  
	  	┖ ---- ui
		 		┖ ----- Your liquid-ui.*.html files
	  
	  ┖ ----- routing.js
	  ┖ ----- socketHandlers.js
	  



Open and modify your config.js file as follow:

```javascript
var config = {
	applicationFolder: 'applicationTemplate/',

	server: {
		port: 8888,
		publicPort: 8888,
		signalingRoute: 'signaling',
		host: 'localhost'
	},

	client: {
		strategy: 'full_graph',
		useRoutingTable: true,
		webrtc: true
	}
}
```

---

### Create your own component

* create a new file following this naming rule `liquid-component-[componentName].html`
* use the following skeleton in order to create your new liquid-component, make sure to change [componentName] to your componentName (the same componentName appearing in the file name)

```html
<dom-module id="liquid-component-[componentName]">
  <template></template>
  <script>
    Polymer({
      is: 'liquid-component-[componentName]',
      behaviors: [LiquidBehavior]
    });
  </script>
</dom-module>
```

---

### How to use liquid.js in the client side

* Import Polymer (`polymer/polymer.html`) into your page
* Load the liquidAPI.js (`corescripts/liquidAPI.js`) script in your html page
* Liquid.js uses the [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) APIs, if your browser does not define them load the following two polyfill before loading the liquidAPI script: `fetch/fetch.js` and `webcomponentsjs/webcomponents-lite.min.js`.

---

## Liquid API

The liquid.js API uses [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

### Configuration
##### .configure(opts)

### Component API

##### .loadComponent(componentType)
##### .createComponent(componentType, element, options)
##### .loadAndCreateComponent(componentType, element, options)
##### .closeComponent(componentURI)
##### .pairComponent(componentURI1, componentURI2)

##### .migrateComponent(componentType, deviceURI, options)
##### .forkComponent(componentType, deviceURI, options)
##### .cloneComponent(componentType, deviceURI, options)

### Device API

##### .connectDevice(deviceURI1, deviceURI2)
##### .disconnectDevice(deviceURI1, deviceURI2)

### Variable API

##### .pairVariable(variableURI1, variableURI2)
##### .unpairVariable(variableURI1, variableURI2)

### Getters

##### .getComponents()
##### .getComponent()
##### .getDeviceId()		
##### .getDevicesList()
##### .getDevicesInfoList()
##### .getUsername()
##### .getConnectionState()
##### .getLoadableComponents()

### Events

##### addEventListener(eventName, listener)
##### removeEvenetListener(eventName, listener)

##### connect
##### reconnect
##### disconnect
##### pairedDevicesListUpdate
