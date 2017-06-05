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
