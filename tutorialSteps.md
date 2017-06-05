# Liquid.js Tutorial steps

###Make sure your project works
	
1. 	Download the repository from: [https://github.com/liquidjs/icwe2017tutorial](https://github.com/liquidjs/icwe2017tutorial) 
2. 	Install the dependencies:
		
	```
	npm install
	```
	
3.	Installation requires bower, if you do not have bower installed make sure to install it.
	
	```
	npm install -g bower
	```
 		
4.	Start your server using the following command:
	
	```
	npm start
	```
	
5.	Open your **Chrome Browser** and connect to [localhost:8888](localhost:8888)
	
6.	If everything is working correctly then you should see the Liquid.js Logo in the homepage

--

###Create your first liquid component
	
####File: "/applicationTemplate/public/components/liquid-component-text"
	
1.	Make sure that the _component id_ and the _is_ property are the same as the file name "liquid-component-text"
	
2.	Add the needed import link tag for the **paper-input** element outside of the _liquid-component_:
	
	```html
	<link rel="import" href="/paper-input/paper-input.html">
	``` 	
			
3.	Inside the liquid component template insert your paper-input element: 
	
	```html
	<template>
		<paper-input value="Hello world"></paper-input>
	</template>
	```
			
	Make sure to initialise its _value_ property to "Hello World".
			 
4. Inject the _LiquidBehavior_ inside _liquid-component-text_:
	
	```javascript
	behaviors: [LiquidBehavior],
	``` 	
	
	Make sure that **LiquidBehavior** is capitalised and there is a comma after the array definition.
	
5.	Check your result in the browser. You can create your component using the provided UI. In the top right of the webpage select the **text** component in the dropdown menu and click the **+** icon to create your component.

6.	You can try to migrate, fork, clone your component on other devices by clicking on the **wrench** icon at the top the component you created. After executing a primitive you will notice that the state always initialise to "Hello World", in fact we did not define any **liquid property** yet.

7.	Return to your editor and create a new property:

	```javascript
	text: {
		type: String,         // Optional, but it helps liquid.js optimise synchronisation 
		notify: true,         // Two way binding in Polymer
		value: "Hello World", // Initial value of the property
		liquid: true          // Makes a property liqiud
	}
```
	
8.	Bind the property you created to the value property of the paper-input element we previously created.
	
	```html
	<paper-input value="{{text}}"></paper-input>
	```
	
9.	Enjoy your first liquid element in the browser

--

### Loading your first liquid component by using the componentAPI

####File: "/applicationTemplate/public/scripts/applications.js"
	
1.	In this file you will find some code.
		
	```javascript
	Liquid.configure(liquidOptions)
		.then(function(){
			return Liquid.createComponent('migrate')
		}).then(function(){
			return Liquid.loadComponent('logo')
		}).then(function(){
			return Liquid.createComponent('logo')
		})
```
		
	It configures the Liquid library, it creates the top toolbar you see in the webpage, it loads the assets of the **liquid-component-logo** component and creates an instance of it. This code makes use of Promises.
		
2.	We now load our component in the webpage. For simplicity we use the helper function loadAndCreate instead of first loading and the creating our component. Transparently the framework first load the asset of the component we created from the server, then it creates an instance of it in the webpage.
	
	```javascript
	.then(function(){
		Liquid.loadAndCreateComponent('text')
	})
	```
		
3.	Reload your webpage and notice that now your component is added to the page when you page finished loading without the need to use the provided UI. The component lacks the top liquid-ui it had before (you will notice that there is not a **wrench** icon anymore).

4.	Define all the parameters of the _loadAndCreateComponent_ method:
	
	```javascript
	Liquid.loadAndCreateComponent('text', document.querySelector('body'), {liquidui: 'default'})
	```
	
5.	Look at the result in your browser.
6.	Let's change the UI:
	
	```javascript
	{liquidui: 'red'}
	```
	Developers can create their own **liquid-ui**: look at the folder 
		
	```
	/applicationTemplate/public/ui/*
	```
	
7.	Enjoy your result in your browser.

--

### Create the googlemap component

####File: "/applicationTemplate/public/components/liquid-component-googlemap.html"
	
1.	Add the needed imports:
	
	```html
	<link rel="import" href="/google-map/google-map.html">
	<link rel="import" href="/google-map/google-map-directions.html">
	```
	
2.	Add the LiquidBehavior:
	
	```javascript
	behaviors: [LiquidBehavior],
	```
		
3.	Make the properties **latitude**, **longitude** and **zoom** liquid. You have to change their numerical initialisation to an object definition:
	
	```javascript
	latitude: {
		value: 37,
		type: Number,
		liquid: true
	},
	longitude: {
		value: -122,
		type: Number,
		liquid: true
	},
	zoom: {
		value: 15,
		type: Number,
		liquid: true
	},
	```
	
4.	Enjoy your liquid map in the browser.

5.	Now we will include directions in your googlemap component. Add two liquid-component-text in the component (before the google-map element)
	
	```html
	<liquid-component-text text="{{location1}}"></liquid-component-text>
	<liquid-component-text text="{{location2}}"></liquid-component-text>
	```
	
6.	Make the properties **location1** and **locaiton2** liquid:
	
	```javascript
	location1: {
		value: '',
		type: String,
		liquid: true
	},
	location2: {
		value: '',
		type: String,
		liquid: true
	}
	```
	
7.	Look at the browser for the result

8.	We include the liquid-ui on the top of our text components as well:
	
	```html
	<liquid-component-text liquidui="default" text="{{location1}}"></liquid-component-text>
	<liquid-component-text liquidui="default" text="{{location2}}"></liquid-component-text>
	```
	
9.	In the browser now we can clone either or both of the liquid-component-text component on other devices without the need of moving the googlemap.
