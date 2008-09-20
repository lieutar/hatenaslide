(function(){

  var JSHELPERSWF = 'JSHelper.swf';

////////////////////////////////////////////////////////////
// Base utilities
window.KaeL = {};
KaeL.log = window['console'] ? function(){
  window.console.log.apply( window.console , arguments );
} : function(){
};

////////////////////////////////////////////////////////////
KaeL.string = {};

KaeL.string.ucFirst = function(s){
  var first = s.substring(0,1);
  var last = s.substring(1);
  return first.toUpperCase() + last;
};

KaeL.string.camelize = function(s){
  return s.replace(/[^A-Za-z]([A-Za-z])/g, function(all, $1){
    return $1.toUpperCase();
  });
};

////////////////////////////////////////////////////////////
KaeL.oo = {};
KaeL.oo.Class = (function(){
  return function( spec , opt ){
    var callee =  arguments.callee;
    var klass = function(){};
    klass.prototype =
    ( ( !opt                    ) ? Object :
      ( opt instanceof Function ) ? opt :
      ( opt['extends'] instanceof Function ) ? opt['extends'] :
      Object ).prototype;

    var proto = new klass;
    if( spec instanceof Function ){
      spec.apply( proto , [ klass.prototype ] );
    } else if( spec ){
      for( f in spec )  proto[f] = spec[f];
    }

    if(!( proto.initialize instanceof Function )){
      proto.initialize = function(){};
    }

    var newClass = function(){
      if( this.initialize instanceof Function ){
        this.initialize.apply(this, arguments);
      } else {
        KaeL.log('initialize is not defined');
      }
    };

    newClass.prototype = proto;
    newClass.subClass  = function( spec, opt ){
      if(!opt){
        opt = newClass;
      }else if( !(opt instanceof Function )){
        opt['extends'] = newClass;
      }
      return callee( spec, opt );
    };
    return newClass;
  }
})();

////////////////////////////////////////////////////////////
KaeL.event = {};
KaeL.event.canceler = function(e){
  e.stopPropagation();
  return true;
};

KaeL.event.EventDispatcher = {
  initialize : function( obj ){
    obj._KaeL_event_EventDispatcher = { handlers: [] };
    
    obj.addEventListener = function( name, handler ){
      var h = obj._KaeL_event_EventDispatcher.handlers;
      ( h[ name ] || ( h[ name ] = [] ) ).push( handler );
    };
    
    obj.notifyEvent = function( name, e ){
      var h = obj._KaeL_event_EventDispatcher.handlers[ name ] || [];
      var ret = false;
      for( var i = 0, l = h.length; i < l; i++ ){
        if( h[i].apply( obj, [e] ) ) ret = true;
      }
      return ret ? true : false;
    };
  }
};

////////////////////////////////////////////////////////////
KaeL.swf = function(opt){
  var url   = opt.url;
  var width = opt.width || 300;
  var height = opt.height || 300;
  obj = document.createElement('object');
  obj.setAttribute('allowScriptAccess', 'always');
  obj.type   = 'application/x-shockwave-flash';
  obj.width  = width;
  obj.height = height;
  obj.data   = url;
  return obj;
};

KaeL.withJSHelper = (function(){
  var helper = null;
  return function( continuation ){
    var thisProc = arguments.callee;
    var action   = function(){ thisProc( continuation ); };
    var wait     = 100;
    if(helper){
      if(helper.available){
        continuation( helper );
        return;
      }
    } else{
      helper = KaeL.swf( {url: JSHELPERSWF } );
      helper.style.cssText = ['position:absolute;',
                              'top:-300px'].join('\n');
      if( document.body ){
        document.body.appendChild( helper );
      }
    }
    setTimeout( action, wait );
  }
})();

KaeL.image = {};
KaeL.image.withClippedImage = (function(){
  var dic     = {};
  var counter = 0;
  return function( url, x,y,w,h , continuation){
    var key = [url, x,y,w,h].join('\x1b');
    if( dic[key] ){
      setTimeout( function(){ continuation(dic[key]) });
      return;
    }
    KaeL.withJSHelper( function(helper){
      (window.KaeL.image.withClippedImage.callback ||
       (window.KaeL.image.withClippedImage.callback = [])
       )[counter] = function(img){
         dic[key] = img;
         continuation(img);
       }
      helper.withClippedImage( url, x,y,w,h,
                               'window.KaeL.image.withClippedImage.callback['
                               + counter + ']' );
      counter++;
    });
  }
})();

////////////////////////////////////////////////////////////
KaeL.dhtml = {};
KaeL.dhtml.addEventListener =
( window['addEventListener'] ? function( elem, type, func){
  elem.addEventListener( type, func, false );
} :
  ( window['attachEvent'] ? function( elem, type, func){
    elem.attachEvent( 'on' + type , function(e){
      func(e || window.event);
      });
  } : function( elem, type, func ){
    var attr ='on' + type;
    elem[attr] = func;
  }));

KaeL.dhtml.getElementRectangle = function( elem , is_local ){
  var x = 0;
  var y = 0;
  var z = parseInt(elem.style.zIndex);
  var w = elem.clientWidth;
  var h = elem.clientHeight;
  var p = elem.style.position;
  if( is_local ){
    x = elem.offsetLeft;
    y = elem.offsetTop;
  } else {
    while( elem ){
      x += elem.offsetLeft;
      y += elem.offsetTop;
      elem = elem.offsetParent;
    }
  }
  return { x: x,
           y: y,
           z: z,
           width: w,
           height: h,
           position: p };
};

KaeL.dhtml.KeyEventDispatcher =  (function(){
  var dic =
  {  8:"backspace",      9:"tab",       13:"return",
     16:"shift",        17:"ctrl",      18:"alt",
     19:"pause",        27:"escape",    32:" ",
     33:"pageup",       34:"pagedown",  35:"end",   36:"home",
     37:"left",         38:"up",        39:"right", 40:"bottom",
     44:"printscreen",  45:"insert",    46:"delete",
     112:"f1",         113:"f2",       114:"f3",
     115:"f4",         116:"f5",       117:"f6",
     118:"f7",         119:"f8",       120:"f9",
     121:"f10",        122:"f11",      123:"f12",
     144:"numlock",    145:"scrolllock" };
  
  var getKeyNames = function(e){
    var ret = ['any'];
    var exists = {};
    
    if( dic[e.keyCode] ) {
      ret.push( dic[e.keyCode] );
    }
    
    if( e.charCode && e.charCode != 0 ){
      var c = String.fromCharCode( e.charCode );
      ret.push( c );
      if( e.shiftKey ){
        ret.push( c.toLowerCase() );
      }
    }
    //KaeL.log('ret::', ret);
    return ret;
  };
  
  return {
  initialize: function(o){
    o._KaeL_dhtml_KeyEventDispatcher = props;
    var props = { keyHandlers: {} };
    
    o.addKeyListener = function( key, type, handler ){
      
      var typeHandlers = ( props.keyHandlers[type]  ||
                           ( props.keyHandlers[type] = {} ));
      
      var keyHandlers = ( typeHandlers[key] ||
                          ( typeHandlers[key] = [] ) );
      
      keyHandlers.push( handler );
    };
    
    o.notifyKeyEvent = function( type, e ){
      //KaeL.log(type);
      var ret   = false;
      var found = false;
      var names = getKeyNames(e);
      var typehandlers = props.keyHandlers[type] || {};
          for( var i=0, l=names.length; i<l; i++ ){
            var keyhandlers = typehandlers[ names[i] ] || [];
            for( var j = 0, m=keyhandlers.length; j < m; j++ ){
              found = true;
              if(keyhandlers[j](e)) ret = true;
            }
          }
      if( !found ){
        var defaulthandlers = typehandlers.default || [];
        for( k = 0, n = defaulthandlers.length; k < n; k++ ){
          if( defaulthandlers[k](e) ) ret = true;
        }
      }
      return ret;
    };
  }
  }
})();

})();
