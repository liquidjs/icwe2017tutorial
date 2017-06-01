/* global Y, global */
'use strict'

/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {boolean} [asString=false] set to true to return the hash value as 
 *     8-digit hex string instead of an integer
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {integer | string}
 */
function hashFnv32a(str, asString, seed) {
    /*jshint bitwise:false */
    var i, l,
        hval = (seed === undefined) ? 0x811c9dc5 : seed;

    for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    if( asString ){
        // Convert to 8 digit hex string
        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    }
    return hval >>> 0;
}

function extendLiquidConnector (Y) {
  const debug = false

  class Connector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }

      options.role = 'slave'

      // options.debug = true
      super(y, options)

      /**
       * @deprecated  Using a timestamp is not working for same device components.
       *              Use hashFnv32a() instead.
       * @return {[type]} [description]
       */
      this.createId = function() {
        // Date().getTime() returns time to the miliseconds which is not precise
        //  enough when dealing with components on the same device
        // return new Date().getTime()
        return window.performance.now() 
      }

      this.addTable = function(url) {
        let str = ''+url.device+'.'+url.componentRef+'.'+url.variable
        // let id = this.createId()
        let id = hashFnv32a(str, true)

        if(!this.idToUrlTable) {
          this.idToUrlTable = {}
          this.urlToIdTable = {}
        }

        this.idToUrlTable[id] = url
        this.urlToIdTable[url] = id

        return id
      }

      /**
       * Removes enrty from table
       */
      this.removeTable = function(url) {
        let str = ''+url.device+'.'+url.componentRef+'.'+url.variable
        let id = hashFnv32a(str, true)
        delete this.idToUrlTable[id]
        delete this.urlToIdTable[url]
      }

      this.getUrl = function(id) {
        if (! this.idToUrlTable[id]) {
          throw new Error(`Can't find any url for id: ${id}!!!`)
        }
        return this.idToUrlTable[id]
      }

      this.getId = function(url) {
        return this.urlToIdTable[url]
      }

      // this.idToUrl = function(id) {
      //   var a = id.split('/');
      //   return {
      //     device: a[0],
      //     componentRef: a[1],
      //     variable: a[2]
      //   }
      // }

      // this.urlToId = function(url) {
      //   return url.device + '/' + url.componentRef + '/' + url.variable
      // }

      var componentReference = {
        device: options.component.__liquidComponentUrl.device,
        componentRef: options.component.__liquidComponentUrl.componentRef,
        type: options.component.__liquidComponentUrl.type,
        variable: options.variable
      }

      var emitter = options.eventEmitter

      this.component = options.component
      this.reference = componentReference
      this.variable = componentReference.variable

      var personalId = this.addTable(this.reference)
      this.setUserId(personalId)

      var self = this


      emitter.addListener('bind-connect', function(variableURL){
        var id = self.addTable(variableURL)
        if(debug)console.warn(`userjoined: ${id}  bind-connect  device:${variableURL.device}.${variableURL.componentRef}.${variableURL.variable}`)
        self.userJoined(id, 'master')
      })

      emitter.addListener('bind-disconnect', function(variableURL){
        const id = self.getId(variableURL)
        if(debug)console.warn(`userleft: ${id}  bind-disconnect  device:${variableURL.device}.${variableURL.componentRef}.${variableURL.variable}`)
        self.userLeft(id)
        self.component.unpairVariable(variableURL)
        self.removeTable(variableURL)

        // Should we remove the listener here or in destroy????
        // emitter.removeListener('bind-disconnect', console.warn('Removed Listener <bind-disconnect>'))
        // emitter.removeListener('bind-connect', console.warn('Removed Listener <bind-connect>'))
        // emitter.removeListener('y-message', console.warn('Removed Listener <y-message>'))
      })

      emitter.addListener('unregister', (variableURL) => {
        /* Send unregister message to peers */
        const disconnect_msg = {
          operation: 'unregister',
          url: variableURL
        } 
        self.broadcast(disconnect_msg)
        /* Local Cleanup of this variable */
        // LiquidPeerConnection.unregisterPairedVariable(variableURL, variableURL)
        LiquidPeerConnection.unregisterLocalPairedVariable(variableURL)
        // self.component.unpairVariable(variableURL)

        // Should we remove the listener here????
        // emitter.removeListerner('unregister', console.warn('Removed listerner <unregister>'))
      })

      emitter.addListener('y-message', function(fromURL, message) {
        self.receiveMessage(self.getId(fromURL), message.payload)
      })
    }
    
    disconnect () {
      console.error('TODO: disconnect')
      // this.socket.emit('leaveRoom', this.options.room)
      // this.socket.disconnect()
      super.disconnect()
    }
    
    destroy () {
      console.error('TODO: destroy')
      // this.disconnect()
      // this.socket.off('disconnect', this._onDisconnect)
      // this.socket.off('yjsEvent', this._onYjsEvent)
      // this.socket.off('connect', this._onConnect)
      // this.socket.destroy()
      // this.socket = null
    }
    
    reconnect () {
      console.log('reconnect')
      // this.socket.connect()
      super.reconnect()
    }
    
    send (uid, yMessage) {
      var toURL = this.getUrl(uid)

      var message = {
        operation: 'yMessage',
        payload: yMessage,
        from: this.reference,
        to: toURL
      }
      if (!toURL) {
        throw new Error(`Can't find any url for id: ${id}!!! from _send`)
        return
      }
      Liquid.sendMessage(toURL, message)
    }
    
    broadcast (yMessage) {
      const urls = this.component.__variablePairs[this.variable]
      
      if(LiquidPeerConnection.shouldPackageBroadcastMessages()) {
        let destinations = urls.outgoing.concat(urls.incoming)
        LiquidPeerConnection.broadcastPackagedMessage(yMessage, this.reference, destinations)
      } else {
        var outgoing = urls.outgoing
        for(var i = 0; i < outgoing.length; i++) {
          var message = {
            operation: 'yMessage',
            payload: yMessage,
            from: this.reference,
            to: outgoing[i]
          }
          Liquid.sendMessage(outgoing[i], message)
        }

        var incoming = urls.incoming
        for(var i = 0; i < incoming.length; i++) {
          var message = {
            operation: 'yMessage',
            payload: yMessage,
            from: this.reference,
            to: incoming[i]
          }
          Liquid.sendMessage(incoming[i], message)
        }
      }
    }
    
    isDisconnected () {
      return false
    }
  }

  Y.extend('liquid', Connector)
}

if (typeof Y !== 'undefined') {
  extendLiquidConnector(Y)
}
