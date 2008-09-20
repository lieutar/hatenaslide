(function(){
////////////////////////////////////////////////////////////
//           GUI Tool Kit classes and objects             //
////////////////////////////////////////////////////////////
  var URL_BASE = (function(){
    var elems = document.getElementsByTagName('script');
    for( var i = 0, l = elems.length; i < l ; i++){
      var e = elems[i];
      if(( "" +  e.src  ).match(/\/dtk\.js/)){
        return e.src.replace(/\/dtk\.js.*/,'');
      }
    }
      
  })();

window.dtk = {};

dtk.WM = {

  initialize: function(){

    KaeL.event.EventDispatcher.initialize( this );
    KaeL.dhtml.KeyEventDispatcher.initialize( this );
    this.grabbed        = null;
    this.lastMouseEvent = null;
    this.areas          = [];
    this.overedAreas    = {};

    var oldX = 0;
    var oldY = 0;
    var self = this;

    var handler = function( main ){
      return function(e){
        e.oldX = oldX;
        e.oldY = oldY;
        this.lastMouseEvent = e;
        var stop = main( e );
        oldX = e.clientX;
        oldY = e.clientY;
        if( stop ){
          return KaeL.event.canceler( e );
        }
        return stop;
      }
    };

    var ae = function(type, hndl){
      KaeL.dhtml.addEventListener( window, type, handler( hndl));
    }

    //window.onkeydown = function(){ KaeL.log('down') };

    window.onkeydown = handler(function(e){
      var ret = false;
      if( self.notifyEvent( 'keydown', e ) ) ret = true;
      if( self.notifyKeyEvent( 'keydown', e ) ) ret = true;
      return ret;
    });

    window.onkeyup = handler( function(e){
      var ret = false;
      if( self.notifyEvent('keyup', e)) ret = true;
      if( self.notifyKeyEvent('keyup', e)) ret = true;
      return ret;
    });


    ae('mousemove', function(e){
      var ret  = false;
      // grabbed
      if( self.grabbed instanceof Function && self.grabbed( e ) ) ret = true;

      // over
      var areas     = self.areas;
      var newOvered = {};
      for( var i = 0, l=areas.length; i < l ; i++){
        var area = areas[i];
        if( area.contains( e.clientX, e.clientY ) ){
          if( !self.overedAreas[area.id] ){
            if( area.notifyEvent('mouseover', e) ) ret = true;
          }
          if( area.notifyEvent('mousemove', e) ) ret = true;
          delete( self.overedAreas[area.id] );
          newOvered[ area.id ] = area;
        }
      }

      // out
      for( var f in self.overedAreas ){
        if(self.overedAreas[f].notifyEvent('mouseout', e )) ret = true;
      }
      self.overedAreas = newOvered;
        
      // move
      if( self.notifyEvent( 'mousemove' , e ) ) ret = true;

      // post process
      return ret;
    });

    ae('mousedown', function(e){
      var ret   = false;
      var areas = self.areas;
      for( var i = 0 , l = areas.length; i < l; i++ ){
        if(areas[i].contains( e.clientX, e.clientY )){
          if(areas[i].notifyEvent('mousedown')) ret = true;
        }
      }
      if(self.notifyEvent( 'mousedown' , e )) ret = true;
      return ret;
    });

    ae('mouseup', function(e){
      self.grabbed = null;
      var ret = false;
      var areas = self.areas;
      for( var i = 0 , l = areas.length; i < l; i++ ){
        if(areas[i].contains( e.clientX, e.clientY )){
          if(areas[i].notifyEvent('mouseup')) ret = true;
        }
      }
      if( self.notifyEvent( 'mouseup', e ) ) ret = true;
      return ret;
    });

    ae('resize', function(e){
      return self.notifyEvent('resize', e);
    });
  },

  grab: function(action){ this.grabbed = action; },

  registerArea: function( area ){
    this.areas.push( area );
  },

  dropArea: function( area ){
    var areas    = this.areas;
    var i = 0;
    var found = false;
    for(var l = areas.length; i < l ;i++){
      if( areas[i] !== area ) continue;
      found = true;
      break;
    }
    if(!found) return;
    delete this.overedAreas[area.id];
    areas.splice(i, 1);
  },

  rectangle: function(){
    return { x: 0,
             y: 0,
             z: 0,
             width: window.innerWidth,
             height: window.innerHeight}
  }
};

KaeL.dhtml.addEventListener(window, 'load', function(){
  dtk.WM.initialize();
});

////////////////////////////////////////////////////////////
dtk.Area = KaeL.oo.Class( function(){
  this.initialize = (function(){
    var counter = 0;
    return function(opt){
      this.id     = 'area-' + counter++;
      this.x      = opt.x;
      this.y      = opt.y;
      this.width  = opt.width;
      this.height = opt.height;
      KaeL.event.EventDispatcher.initialize( this );
      dtk.WM.registerArea( this );
    }})();

  this.dispose = function(){
    dtk.WM.dropArea( this );
  };

  this.contains = function(x, y){
    return (x >= this.x && x < this.x + this.width &&
            y >= this.y && y < this.y + this.height );
  };
});


////////////////////////////////////////////////////////////
dtk.TileFiller = KaeL.oo.Class( {

    initialize: function(opt){
      this.sprite       = opt.sprite;
      this.tile         = opt.tile;
      var area = opt.area || [0, 0];
      this.fromX        = area[0];
      this.fromY        = area[1];
      this.width        = area[2];
      this.height       = area[3];
      this.tiles        = [];
      this.cols         = 0;
      this.rows         = 0;
      this.previousArea = null;
      this.fill();
    },

    getArea: function(){
      var rect = this.sprite.rectangle();
      var x = this.fromX < 0 ? rect.width + this.fromX : this.fromX;
      var y = this.fromY < 0 ? rect.height + this.fromY : this.fromY;
      var w = ( isNaN( this.width )
                ? rect.width - x
                : ( ( this.width < 0 )
                    ? rect.width  + this.width
                    : this.width  ) );
      var h = ( isNaN( this.height )
                ? rect.height - y
                : ( ( this.height < 0 )
                    ? rect.height + this.height
                    : this.height ) );
      var ret = { x:x,  y:y,  width:w,  height:h };
      return ret;
    },

    clear: function(){},
    fill: function(){},
    resized: function(){}

  } );

  dtk.SimpleFiller = dtk.TileFiller.subClass({

    initialize: function(){
      this.imageElem = null;
      this.generation = 0;
      dtk.TileFiller.prototype.initialize.apply( this, arguments );
    },

    clear: function(){
      this.generation++;
      if( ! this.imageElem )return;
      this.sprite.elem.removeChild( this.imageElem );
    },


    fill: function( ){
      var self = this;
      var area = this.getArea();
      var tile = this.tile;
      var tr   = tile.rectangle;
      var elem = this.sprite.elem;
      var area = this.getArea();
      this.generation++;
      KaeL.image.withClippedImage( tile.img, tr.x, tr.y, tr.width, tr.height,
                                   (function( gen ){
        return function( url ){
          if( self.generation != gen ) return;
          var div = elem.ownerDocument.createElement('div');
          div.ondragstart = KaeL.event.canceler;
          div.ondrag = KaeL.event.canceler;
          var style = div.style;
          style.position = 'absolute';
          style.left     = area.x + 'px';
          style.top      = area.y + 'px';
          style.width = area.width + 'px';
          style.height = area.height + 'px';
          style.backgroundImage = 'url(' + url + ')';
          elem.appendChild( div );
          self.imageElem = div;
        }
      })( this.generation ));
    },
  });

  dtk.TileFillerPJ = dtk.TileFiller.subClass({

    clear: function(){
      var tiles = this.tiles || [];
      var elem  = this.sprite.elem;
      for( var i = 0 , l = tiles.length; i < l ; i++ ){
        elem.removeChild( tiles[i] );
      }
      this.tiles = [];
    },

    fill: function( area ){

      area = this.getArea();
      this.previousArea = area;

      this.tiles = [];
      var tile = this.tile;
      var cr   = tile.rectangle;
      var cW   = cr.width;
      var cH   = cr.height;
      var elem = this.sprite.elem;
      var naem = this.name;
      var doc  = elem.ownerDocument;
      var cols = 0;
      var rows = 0;
      var x    = area.x;
      var y    = area.y;
      var w    = area.width;
      var h    = area.height;
      var rH   = h;

      for(var Y = 0; Y < h; Y += cH ){
        rows++;
        var rW = w;
        cols = 0;
        for( var X = 0; X < w; X+= cW ){
          cols++;
          var style = tile.style;
          this.tiles.push( tile.paste({  elem: elem,
                                            x: ( x + X ),
                                            y: ( y + Y ),
                                        width:  Math.min( rW, cW ),
                                       height: Math.min( rH, cH ) }));
          rW -= cW;
        }
        rH -= cH;
      }
      this.rows = rows;
      this.cols = cols;
    },

  });

  ////////////////////////////////////////////////////////////

  dtk.Tile = KaeL.oo.Class( {
    initialize: function( img, name, rectangle ){
      this.name      = name;
      this.img       = img;
      this.rectangle = rectangle;
    },

    fillSimply: function(elem){
      var style = elem.style;
      with( this.rectangle ){
        style.backgroundImage    = 'url("' + this.img + '")';
        style.backgroundRepeat   = 'no-repeat';
        style.backgroundPosition = '-' + x + 'px -' + y + 'px';
      }
    },

    completeOpt: function(opt){
      with( this.rectangle ){
        opt.x = ( isNaN(opt.x) ? 0 : opt.x );
        opt.y = ( isNaN(opt.y) ? 0 : opt.y );
        opt.width = ( isNaN(opt.width) ? width : opt.width );
        opt.height = ( isNaN(opt.height) ? height : opt.height );
      }
    },

    paste: function( opt ){
      var elem = opt.elem;
      if( !opt  ) opt = {};
      var tile = elem.ownerDocument.createElement('div');
      tile.ondragstart = KaeL.event.canceler;
      tile.ondrag = KaeL.event.canceler;
      var style = tile.style;
      with( this.rectangle ){
        this.completeOpt( opt );
        style.position    = 'absolute';
        style.left        = opt.x + 'px';
        style.top         = opt.y + 'px';
        style.width       = opt.width + 'px';
        style.height      = opt.height + 'px';
        style.backgroundImage    = 'url("' + this.img + '")';
        style.backgroundRepeat   = 'no-repeat';
        style.backgroundPosition = '-' + x + 'px -' + y + 'px';
      }
      elem.appendChild( tile );
      return tile;
    },

   fill: function(opt){
      return new dtk.SimpleFiller({
                   tile: this,
                 sprite: opt.sprite,
                   area: [opt.x, opt.y, opt.width, opt.height]
      });
   }
  });

  ////////////////////////////////////////////////////////////
  dtk.TileSet     = KaeL.oo.Class( {

    initialize:  function( img, tiledic, tileset ){
      this.img     = img;
      this.tiledic = tiledic;
      this.tileset = tileset;
    },

    tile: function( name ){
      var spec  = this.tiledic[ name ];
      if( !spec ) throw new Error( "unknown tile name : " + name);
      var x = spec[0];
      var y = spec[1];
      var w = spec[2];
      var h = spec[3];
      return  new dtk.Tile( this.img,
                            name,
                            { x: x, y: y , width: w, height: h } );
    },

    tiles: function( name ){
      var ret = {};
      var set = this.tileset[ name ] || {};
      for( f in set ){
        ret[f] = this.tile( set[f] );
      }
      return ret;
    }
  } );

dtk.defaultTileSet = new dtk.TileSet( 
  URL_BASE + '/dtk.png',
  {
    balloon_y_nw:  [  0,  0, 20, 20],
    balloon_y_n:   [ 20,  0, 10, 20],
    balloon_y_ne:  [ 30,  0, 20, 20],

    balloon_y_w:   [  0, 20, 20, 10],
    balloon_y_body:[ 20, 20, 10, 10],
    balloon_y_e:   [ 30, 20, 20, 10],

    balloon_y_sw:  [  0, 30, 20, 20],
    balloon_y_s:   [ 20, 30, 10, 20],
    balloon_y_se:  [ 30, 30, 20, 20],

    balloon_y_NW:  [ 50,  0, 20, 20],
    balloon_y_N:   [ 70,  0, 10, 20],
    balloon_y_NE:  [ 80,  0, 20, 20],

    balloon_y_W:   [ 50, 20, 20, 10],
    balloon_y_E:   [ 80, 20, 20, 10],

    balloon_y_SW:  [ 50, 30, 20, 20],
    balloon_y_S:   [ 70, 30, 10, 20],
    balloon_y_SE:  [ 80, 30, 20, 20],


    balloon_w_nw:  [  0, 50, 20, 20],
    balloon_w_n:   [ 20, 50, 10, 20],
    balloon_w_ne:  [ 30, 50, 20, 20],

    balloon_w_w:   [  0, 70, 20, 10],
    balloon_w_body:[ 20, 70, 10, 10],
    balloon_w_e:   [ 30, 70, 20, 10],

    balloon_w_sw:  [  0, 80, 20, 20],
    balloon_w_s:   [ 20, 80, 10, 20],
    balloon_w_se:  [ 30, 80, 20, 20],

    balloon_w_NW:  [ 50, 50, 20, 20],
    balloon_w_N:   [ 70, 50, 10, 20],
    balloon_w_NE:  [ 80, 50, 20, 20],

    balloon_w_W:   [ 50, 70, 20, 10],
    balloon_w_E:   [ 80, 70, 20, 10],

    balloon_w_SW:  [ 50, 80, 20, 20],
    balloon_w_S:   [ 70, 80, 10, 20],
    balloon_w_SE:  [ 80, 80, 20, 20],


    hslider_knob: [ 0,105, 8,20],
    hslider_head: [ 8,105,10,20],
    hslider_body: [18,105,10,20],
    hslider_foot: [28,105,10,20],

    bt_first_d:   [ 0,115,15,10],
    bt_prev_d:    [15,115,15,10],
    bt_pageNum_d: [30,115,15,10],
    bt_next_d:    [45,115,15,10],
    bt_last_d:    [60,115,15,10],

    bt_first_a:   [ 0,125,15,10],
    bt_prev_a:    [15,125,15,10],
    bt_pageNum_a: [30,125,15,10],
    bt_next_a:    [45,125,15,10],
    bt_last_a:    [60,125,15,10],
  },
  {
      yellowBalloon: { body: 'balloon_y_body',
                       nw: 'balloon_y_nw',
                       n: 'balloon_y_n',
                       ne: 'balloon_y_ne',
                       e: 'balloon_y_e',
                       se: 'balloon_y_se',
                       s: 'balloon_y_s',
                       sw: 'balloon_y_sw',
                       w: 'balloon_y_w',
                       NW: 'balloon_y_NW',
                       N: 'balloon_y_N',
                       NE: 'balloon_y_NE',
                       E: 'balloon_y_E',
                       SE: 'balloon_y_SE',
                       S: 'balloon_y_S',
                       SW: 'balloon_y_SW',
                       W: 'balloon_y_W' },

      whiteBalloon: { body: 'balloon_w_body',
                       nw: 'balloon_w_nw',
                       n: 'balloon_w_n',
                       ne: 'balloon_w_ne',
                       e: 'balloon_w_e',
                       se: 'balloon_w_se',
                       s: 'balloon_w_s',
                       sw: 'balloon_w_sw',
                       w: 'balloon_w_w',
                       NW: 'balloon_w_NW',
                       N: 'balloon_w_N',
                       NE: 'balloon_w_NE',
                       E: 'balloon_w_E',
                       SE: 'balloon_w_SE',
                       S: 'balloon_w_S',
                       SW: 'balloon_w_SW',
                       W: 'balloon_w_W' },

      hslider: { knob: 'hslider_knob',
                 head: 'hslider_head',
                 body: 'hslider_body',
                 foot: 'hslider_foot' },
    }
 );


  ////////////////////////////////////////////////////////////
  dtk.Sprite = (function(){

    var Sprite = KaeL.oo.Class( function( superProto ){

    this.initialize = function( opt ){

      if(!opt) opt = {};
      var self = this;

      KaeL.event.EventDispatcher.initialize( this );

      var x = null, y = null;

      var elem = (opt.doc || window.document).createElement('div');
      this.elem = elem;
      elem.style.position = (opt.position == 'fixed'
                             ? 'fixed' : 'absolute');

      this._Sprite  = { shown:         false,
                        parentElement: (opt.container ?
                                        opt.container.elem :
                                        (opt.parentElement || document.body)),
                        width:  null,
                        height: null,
                        x: null,
                        y: null,
                        z: null,
                        rect: null};

      elem._Sprite  = this;
      this.moveTo((isNaN(opt.x) ? 0 : opt.x),
                  (isNaN(opt.y) ? 0 : opt.y),
                  (isNaN(opt.z) ? 9999 : opt.z));

      this.resizeTo( opt.width,  opt.height );

      //
      elem.ondragstart = KaeL.event.canceler;
      elem.ondrag      = KaeL.event.canceler;

      KaeL.dhtml.addEventListener(elem,'mousedown',function(e){
        var ret = self.notifyEvent('mousedown', e);
        if( ret ) KaeL.event.canceler( e );
        return ret;
      });

      KaeL.dhtml.addEventListener( elem, 'mouseup', function(e){
        var ret =  self.notifyEvent('mouseup', e);
        if( ret ) KaeL.event.canceler( e );
        return ret;
      });
      //

      this.show();
    };

    this.checkResized = function(){
      var pre     = this._Sprite.rectangle || { width: -1, height: -1 };
      var current = this.rectangle();
      this._Sprite.rectangle = current;
      if( pre.width == current.width && pre.height == current.height ) {
          return false;
        }
      this.notifyEvent('resize', { type: 'resize',
                                   source: this,
                                   prerect: pre});
      return true;
    };

    this.setHTML = function(html){
      this.elem.innerHTML = html;
      this.checkResized();
    };

    this.setText = function(text){
      this.elem.innerHTML = '';
      this.elem.appendChild( this.elem.ownerDocument.createTextNode(text) );
      this.elem.normalize();
      this.checkResized();
    };

    this.appendChild = function(){
      for(var i = 0, l = arguments.length; i < l; i++){
        var o = arguments[i];
        if( o instanceof Sprite ){
          o.container( this );
        } else {
          this.elem.appendChild( o );
        }
      }
      this.checkResized();
    };

    this.container = function( newContainer ){
      if( arguments.length > 0 ){
        var s = this._Sprite;
        s.parentElement.removeChild( this.elem );
        s.parentElement = newContainer.elem;
        s.parentElement.appendChild( this.elem );
        return newContainer;
      }
      var elem = this.elem.offsetParent;
      while( elem ){
        if( elem._Sprite ) return elem._Sprite;
        elem = elem.offsetParent;
      }
      return null;
    },

    this.show = function(){
      var dic = this._Sprite;
      var elem = this.elem;
      var parent = dic.parentElement;
      if( dic.shown ) return;
      dic.shown = true;
      parent.appendChild( elem );
      this.notifyEvent( 'show' , {type:'show', source: this});
    };

    this.hide = function(){
      var dic = this._Sprite;
      var elem = this.elem;
      var parent = dic.parentElement;
      if( !dic.shown ) return;
      dic.shown = false;
      parent.removeChild( elem );
      this.notifyEvent( 'hide' , {type:'hide', source: this});
    };

    this.visible = function(flag){
      var dic   = this._Sprite;
      if( arguments.length > 0 ){
        if(!parent) {
          KaeL.log('parent is undefined');
        }
        if( flag ){
          this.show();
        } else {
          this.hide();
        }
      }
      return dic.shown;
    };

    this.moveTo = function( x, y, z ){

      var s   = this.elem.style;

      if( !isNaN(x) ){
        if( x < 0 ){
          s.right = (- x)  + 'px';
        } else {
          s.left  = x + 'px';
        }
      }

      if( !isNaN(y) ) {
        if( y < 0 ){
          s.bottom = (- y) + 'px';
        } else {
          s.top = y + 'px';
        }
      }

      if( !isNaN(z) ) {
        s.zIndex = z;
      }

      this.notifyEvent('move', {type:'move'});
    };

    this.dropSize = function(){
      var p = this._Sprite;
      p.width = null;
      p.height = null;
      var s = this.elem.style;
      delete s.width;
      delete s.height;
    };

    this.resizeTo = function( w, h ){
      var s = this.elem.style;
      var p = this._Sprite;
      if( !isNaN(w)  ) {
        s.width = w + 'px';
        p.width = w;
      }
      if( !isNaN(h) ){
        s.height = h + 'px';
        p.height = h;
      }
    };

    this.rectangle = function( is_local ){
      this._Sprite.rectangle =
        KaeL.dhtml.getElementRectangle( this.elem, is_local );
      return this._Sprite.rectangle;
    };

    this.opacity = function( n ){
      var s = this.elem.style;
      if( arguments.length > 0 ){
        s.MozOpacity = n;
        s.opacity    = n;
      }
      return s.MozOpacity || s.opacity;
    };

    } );
    return Sprite;
  })();

  ////////////////////////////////////////////////////////////
  dtk.HSlider = dtk.Sprite.subClass( {

    initialize: function(opt){
      var self = this;
      dtk.Sprite.prototype.initialize.apply( this, [ opt ] );
      KaeL.event.EventDispatcher.initialize( this );

      this.value     = isNaN(opt.value) ? 0.5 : opt.value;
      var imgOriginX = isNaN(opt.imgOriginX) ? 0 : opt.imgOriginX;
      var imgOriginY = isNaN(opt.imgOriginY) ? 0 : opt.imgOriginY;
      this.show();
      var rect       = this.rectangle();
      var width      = rect.width;
      var height     = rect.height;
      var tiles      = opt.tiles;
      this.knobWidth = tiles.knob.rectangle.width;
      var knob = new dtk.Sprite( { x: 0,
                                   y: 0,
                                   width:  this.knobWidth,
                                   height: rect.height,
                                   container: this } );
      knob.slider = this;
      tiles.knob.fillSimply( knob.elem );
      this.knob  = knob;;

      tiles.head.fill({ sprite: this,
                             x: 0,
                             y: 0,
                         width: tiles.head.rectangle.width,
                        height: height});

      tiles.body.fill({ sprite: this,
                             x: tiles.body.rectangle.width,
                             y: 0,
                         width: - ( tiles.head.rectangle.width +
                                    tiles.foot.rectangle.width ),
                        height: height });

      tiles.foot.fill({ sprite: this,
                             x: - tiles.foot.rectangle.width,
                             y: 0,
                         width: tiles.foot.rectangle.width,
                        height: height });

      var base  = this.elem;
      var rect  = this.rectangle();
      var doc   = base.ownerDocument;

      var slide = function(e){
        var hsf = self.knobWidth / 2;
        var r   = self.rectangle();
        self.value = Math.min( 1,
                               Math.max( 0,
                                         ( e.clientX - r.x - hsf ) /
                                         ( r.width - self.knobWidth ) ));
        self.adjust();
        return true;
      };

      this.addEventListener('mousedown',  function(e){
        slide( e );
        dtk.WM.grab( slide );
        return true;
      });

      this.addEventListener('show', function(e){
        self.adjust();
      });

      var basepos = KaeL.dhtml.getElementRectangle( base );
      this.x = basepos.x;
      this.y = basepos.y;
      this.adjust();
    },

    adjust: function( v ){
      if( !isNaN(v) ) this.value = Math.max(0, Math.min(1, v));
      var r = this.rectangle();
      this.knob.moveTo( ( r.width - this.knobWidth ) * this.value );
      this.notifyEvent('action',
                         {   type: 'action',
                           source: this,
                            value: this.value});
    },

  });

  ////////////////////////////////////////////////////////////
  dtk.IntSlider = KaeL.oo.Class( function(){

    this.initialize = function(opt){
      KaeL.event.EventDispatcher.initialize( this );
      var self = this;
      var base   = this.base  = opt.base;
      this.max   = isNaN(opt.max)   ? 10 : opt.max;
      this.min   = isNaN(opt.min)   ? 0  : opt.min;
      this.value = isNaN(opt.value) ? this.min : opt.value;
      var steps  = this.steps = this.max - this.min;
      this.steps = steps;

      var skip = false;
      this.base.addEventListener( 'action', function(v){
        if( skip ) return;
        self.value = self.min +  Math.round( v.value * steps );
        self.notifyEvent( 'action', { type: 'action',
                                      source: self,
                                      slider: self.base,
                                      value: self.value });
      });

      this.base.addEventListener( 'mouseup', function(e){
        if( skip ) return;
        skip = true;
        base.value = ( self.value - self.min ) / steps;
        base.adjust();
        skip = false;
        self.notifyEvent( 'mouseup', e );
      } );

      var events = ['show', 'hide', 'move'];
      for( var i = 0 , l = events.length; i<l; i++){
        this.base.addEventListener( events[i], (function(event){
          return function(e){ self.notifyEvent( event, e ); }
        })(events[i]));
      }

      for( var f in base ) {
        if( f in this ) continue;
        if( !( base[f] instanceof Function  ) ) continue;
        this[f] = (function(f){
          return function(){
            return this.base[f].apply( this.base,  arguments )
          };
        })(f);
      }
    };

    this.adjust = function(v){
      this.base.adjust( ( v - this.min ) / this.steps );
    };

  } );

  ////////////////////////////////////////////////////////////

  dtk.Balloon = (function(){
    var areas = {};

    var areaBase = KaeL.oo.Class({

      initialize: function( opt ){
        this.balloon = opt.balloon;
        this.x       = opt.x;
        this.y       = opt.y;
      },

      getSize: function(){
        return this.width * this.height;
      },

      modifyFillers: function(){
        throw new Error('FATALl!! getTailOrient is not impremented');
      },

      _calcBalloonOrigin: function(){
        throw new Error('FATALl!! getTailOrient is not impremented');
      },

      calcBalloonOrigin: function(){
        var ret = this._calcBalloonOrigin();
        var padNames = this.padOrients || [];
        var pad      = this.balloon.pad;
        for( var i=0, l= padNames.length; i< l; i++){
          var p = pad[ padNames[i] ];
          ret.x += p[0];
          ret.y += p[1];
        }
        return ret;
      },

      calcLocalOrigin: function(){
        var origin = this._calcBalloonOrigin();
        return {x: origin.x - this.x , y: origin.y - this.y }
      },

      calcRect: function(){
        var tiles = this.balloon.tiles;
        var maxWidth = this.width - ( tiles.e.rectangle.width +
                                      tiles.w.rectangle.width );
      },

      circuitFillers: function( sprite ){
        var fillers = null;
        with( this.balloon.tiles ){
          var nH  = n.rectangle.height;
          var sH  = s.rectangle.height;
          var eW  = e.rectangle.width;
          var wW  = w.rectangle.width;
          var nsH =  nH + sH;
          var ewW =  eW + wW;
          fillers = {
            'nw': [[nw, [   0,   0,   wW,   nH ]]],
            'n':  [[n,  [  wW,   0, -ewW,   nH ]]],
            'ne': [[ne, [ -eW,   0,   eW,   nH ]]],
            'e':  [[e,  [ -eW,  nH,   eW, -nsH ]]],
            'se': [[se, [ -eW, -sH,   eW,   sH ]]],
            's':  [[s,  [  wW, -sH, -ewW,   sH ]]],
            'sw': [[sw, [   0, -sH,   wW,   sH ]]],
            'w':  [[w,  [   0,  nH,   wW, -nsH ]]]
          };
        }

        this.modifyFillers( fillers );
        var circuitFillers = [];
        for ( f in fillers ){
          var fillersA = fillers[f];
          for( var i = 0, l = fillersA.length; i < l ; i++){
            var spec = fillersA[i];
            circuitFillers.push( spec[0].fill({ sprite: sprite,
                                                     x: spec[1][0],
                                                     y: spec[1][1],
                                                 width: spec[1][2],
                                                height: spec[1][3] }) );
          }
        }
        return circuitFillers;
      },

      balloonSize : function(){
        if( !this._blockSize ){
          var c = this.balloon.content;
          var t = this.balloon.tiles;
          var wplus = ( t.e.rectangle.width + 
                        t.w.rectangle.width );
          var hplus = ( t.n.rectangle.height +
                        t.s.rectangle.height );
          var max = this.width - wplus;
          c.elem.style.maxWidth = max + 'px';
          var cr = c.rectangle();
          this._blockSize = { width: cr.width + wplus,
                              height: cr.height + hplus };
        }
        return this._blockSize;
      }
    });

    ///
    
    areas.T = areaBase.subClass({

      padOrients: ['n'],

      name: 'T',

      initialize: function(opt){
        areaBase.prototype.initialize.apply( this, [opt] );
        var wr = dtk.WM.rectangle();
        this.width  = wr.width;
        this.height = this.y;
      },


       modifyFillers: function( fillers ){
         var o  = this._calcBalloonOrigin();
         var t  = this.balloon.tiles;
         var sW = t.s.rectangle.width;
         var sH = t.s.rectangle.height;
         var wW = t.w.rectangle.width;
         var eW = t.e.rectangle.width;
         var w0 = this.x -  o.x - wW - Math.floor(sW / 2);
         var w1 = this.balloonSize().width - ( w0 + sW + wW + eW );
         fillers.s = [[t.s, [           wW, -sH, w0, sH]],
                      [t.S, [      w0 + wW, -sH, sW, sH]],
                      [t.s, [ w0 + wW + sW, -sH, w1, sH]]];
       },

       _calcBalloonOrigin: function(){
         var b    = this.balloonSize();
         var bW   = b.width;
         var bH   = b.height;
         return { x: Math.min( dtk.WM.rectangle().width - bW,
                               Math.max( 0, this.x - bW / 2 ) ),
                  y: this.y - bH };
       }

    });

    ///

    areas.B = areaBase.subClass({

      padOrients: ['s'],

      name: 'B',

      initialize: function(opt){
        areaBase.prototype.initialize.apply( this, [opt] );
        var wr = dtk.WM.rectangle();
        this.width  = wr.width;
        this.height = wr.height - this.y;
      },

      getTailOrient: function(){
        return 'n';
      },

      modifyFillers: function( fillers ){
         var o  = this._calcBalloonOrigin();
         var t  = this.balloon.tiles;
         var nW = t.n.rectangle.width;
         var nH = t.n.rectangle.height;
         var wW = t.w.rectangle.width;
         var eW = t.e.rectangle.width;
         var w0 = this.x -  o.x - (wW + Math.floor(nW / 2));
         var w1 = this.balloonSize().width - ( w0 +
                                               nW +
                                               eW +
                                               wW );
        fillers.n = [[t.n, [          wW, 0, w0, nH]],
                     [t.N, [     w0 + wW, 0, nW, nH]],
                     [t.n, [w0 + wW + nW, 0, w1, nH]]];
      },

      _calcBalloonOrigin: function(){
         var bW = this.balloonSize().width;
         return { x: Math.min( dtk.WM.rectangle().width - bW,
                               Math.max( 0, this.x - Math.floor( bW / 2 )) ),
                  y: this.y };
      }
    });

    ///

    areas.L = areaBase.subClass({

      padOrients: ['w'],

      name: 'L',

      initialize: function(opt){
        areaBase.prototype.initialize.apply( this, [opt] );
        var wr = dtk.WM.rectangle();
        this.width  = this.x;
        this.height = wr.height;
      },

      _calcBalloonOrigin: function(){
        var b  = this.balloonSize();
        var bW = b.width;
        var bH = b.height;
        var t   = this.balloon.tiles;
         return { x: this.x - bW ,
                  y: Math.min( dtk.WM.rectangle().height - bH,
                               Math.max( 0, this.y - Math.floor(bH / 2)) ) };
      },

      modifyFillers: function( fillers ){
        var o = this._calcBalloonOrigin();
        var t = this.balloon.tiles;
        var eW = t.e.rectangle.width;
        var eH = t.e.rectangle.height;
        var nH = t.n.rectangle.height;
        var sH = t.s.rectangle.height;
        var h0 = this.y - o.y - (nH + Math.floor(eH / 2));
        var h1 = this.balloonSize().height - ( h0 + nH + eH + sH);
        fillers.e = [[t.e, [ -eW,           nH, eW, h0]],
                     [t.E, [ -eW,      nH + h0, eW, eH]],
                     [t.e, [ -eW, nH + h0 + eH, eW, h1]]]
      }
    });

    ///

    areas.R = areaBase.subClass({

      padOrients: ['e'],

      name: 'R',

      initialize: function(opt){
        areaBase.prototype.initialize.apply( this, [opt] );
        var wr = dtk.WM.rectangle();
        this.width  = wr.width - this.x;
        this.height = wr.height;
      },


      _calcBalloonOrigin: function(){
        var b  = this.balloonSize();
        var bW = b.width;
        var bH = b.height;
        var t   = this.balloon.tiles;
        var center = this.y - Math.floor( bH / 2 );
        var max    = dtk.WM.rectangle().height - bH;
        var y      = Math.min( max, Math.max( 0, center ) );
        return { x: this.x ,  y: y  };
      },

      modifyFillers: function( fillers ){
        var o = this._calcBalloonOrigin();
        var t = this.balloon.tiles;
        var wW = t.w.rectangle.width;
        var wH = t.w.rectangle.height;
        var nH = t.n.rectangle.height;
        var sH = t.n.rectangle.height;
        var h0 = this.y - ( o.y + nH + Math.floor(wH / 2));
        var h1 = this.balloonSize().height - ( h0 + nH + wH + sH );
        fillers.w = [[t.w, [ 0,           nH, wW, h0]],
                     [t.W, [ 0,      nH + h0, wW, wH]],
                     [t.w, [ 0, nH + h0 + wH, wW, h1]]];
      },

    });

    ///
    
    areas.CX = areaBase.subClass({

      initialize: function( opt ){
        areaBase.prototype.initialize.apply( this, [opt] );
        var wr = dtk.WM.rectangle();
        this.width  = wr.width - this.x;
        this.height = wr.height - this.y;
      }
    });

    ////

    areas.SE = areas.CX.subClass({

      padOrients: ['s','e'],

      name: 'SE',
      modifyFillers: function( fillers ){
        fillers.nw[0][0] = this.balloon.tiles.NW;
      },
      _calcBalloonOrigin: function(){
        return { x: this.x,
                 y: this.y };
      }
    });

    ////

    areas.SW = areas.CX.subClass({
      padOrients: ['s','w'],
      name: 'SW',
      modifyFillers: function( fillers ) {
        fillers.ne[0][0] = this.balloon.tiles.NE;
      },

      _calcBalloonOrigin: function(){
        return { x:  this.x - this.balloonSize().width,
                 y:  this.y }
      }
    });

    ////

    areas.NE = areas.CX.subClass({
      padOrients: ['n','e'],
      name: 'NE',
      modifyFillers: function( fillers ) {
        fillers.sw[0][0] = this.balloon.tiles.SW;
      },

      _calcBalloonOrigin: function(){
        return { x: this.x,
                 y:  this.y - this.balloonSize().width };
      }
    });

    ////
     
   areas.NW = areas.CX.subClass({
      padOrients: ['n','w'],
     name: 'NW',
      modifyFillers: function( fillers ) {
        fillers.se[0][0] = this.balloon.tiles.SE;
      },

      _calcBalloonOrigin: function(){
        var bs = this.balloonSize();
        return { x: this.x - bs.width,
                 y: this.y - bs.height };
      }

    });

    ///

    var Balloon = KaeL.oo.Class( function(){

      this.initialize = function( opt ){
        KaeL.event.EventDispatcher.initialize( this );
        this.pad      = { n: [0, -2], e: [15,0], s: [0, 20],  w: [-2, 0] };
        this.tiles    = opt.tiles;
        this.x        = isNaN(opt.x) ? 0 : opt.x;
        this.y        = isNaN(opt.y) ? 0 : opt.y;
        this.content  = new dtk.Sprite();
        this.sprite   = new dtk.Sprite();
        this.content.container( this.sprite );
        var self = this;
        this.content.addEventListener('resize', function(ev){
          self.redraw();
        });
        this.redraw();
      };

      this.moveTo = function(x, y){
        var preX = this.x;
        var preY = this.y;
        this.x = x;
        this.y = y;
        this.redraw();
        this.notifyEvent('move', { type: 'move',
                                   preX: preX,
                                   preY: preY});
      },

      this.hide = function(){
        this.sprite.hide();
      };

      this.show = function(){
        this.sprite.show();
      };

      this.getArea = function(){

        var x = this.x;
        var y = this.y;
       
        var wr  = dtk.WM.rectangle();
        var opt = { x:  this.x, y:  this.y, balloon: this };
        var t   = this.tiles;
        var wR  = t.w.rectangle;
        var wW  = wR.width;
        var wH  = wR.height;
        var nR  = t.n.rectangle;
        var nW  = nR.width;
        var nH  = nR.height;
        var eR  = t.e.rectangle;
        var eW  = eR.width;
        var eH  = eR.height;
        var sR  = t.s.rectangle;
        var sW  = sR.width;
        var sH  = sR.height;

        if( x < ( wW + nW / 2 ) ) {
          if( y < nH + wH / 2  ) {

            return new areas.SE( opt );

          } else if( y > wr.height - ( sH + wH / 2 ) ){

            return new areas.NE( opt );
          }

        } else if( x > wr.width - ( eW + nW / 2 ) ){

          if( y < nH + eH / 2 ) {

            return new areas.SW( opt );

          } else if( y > wr.height - ( sH + eH / 2 )){
            return new areas.NW( opt );

          }

        }

        var max     = { getSize: function(){ return 0 }};
        var classes = [areas.T, areas.B, areas.L, areas.R];
        for( var i = 0; i < 4; i++ ){
          var a = new classes[i]( opt );
          if( max.getSize() < a.getSize() ) max = a;
        }
        return max;
      };

      this.redraw = function(){

        var self      = this;
        var area      = this.getArea( );
        var origin    = area.calcBalloonOrigin();
        var lo        = area.calcLocalOrigin();
        var preLo     = this.localOrigin || {x: -1, y: -1};
        this.localOrigin = lo;
        var originMoved = preLo.x != lo.x || preLo.y != lo.y;
        var newsize   = area.balloonSize();
        var resized   =  ( this.width  != newsize.width  ||
                           this.height != newsize.height );

        this.width    = newsize.width;
        this.height   = newsize.height;


        if( resized ){
          this.sprite.resizeTo( this.width, this.height );
        }

        if( resized || originMoved ){
          var circuitFillers = this.circuitFillers || [];
          for( var i = 0, l = circuitFillers.length; i < l ; i ++){
            circuitFillers[i].clear();
          }
          this.circuitFillers = area.circuitFillers( this.sprite );
        }

        var wW = this.tiles.w.rectangle.width;
        var nH = this.tiles.n.rectangle.height;
        var eW = this.tiles.e.rectangle.width;
        var sH = this.tiles.s.rectangle.height;
        this.content.moveTo( wW, nH );
        this.sprite.moveTo( origin.x, origin.y );
        if( !resized ) return;
        if(this.bodyFiller) this.bodyFiller.clear();
        this.bodyFiller = 
          this.tiles.body.fill({ sprite: this.sprite,
                                      x: wW,
                                      y: nH,
                                  width: -(wW + eW),
                                 height: -(nH + sH)  });
      };

    });
    Balloon.areas = areas;
    return Balloon;
  })();


  ////////////////////////////////////////////////////////////
  dtk.PeekABoo = KaeL.oo.Class({

    initialize: function(opt){
      this.sprite = opt.sprite;
      this.orient = opt.orient;
      this.steps = opt.steps || 5;
      var self = this;
      this.rectangle( this.sprite.rectangle() );
    },

    dispose: function(){
      if(this.area) this.area.dispose();
    },

    rectangle: function( sr ){
      if( !sr ) throw new Error( 'set rectangle is not supported' );

      if( this.area ) this.area.dispose();
      var wr = dtk.WM.rectangle();
      var steps = this.steps;
      this.x = [sr.x, sr.x, sr.x ];
      this.y = [sr.y, sr.y, sr.y ];
      this.axis = null;

      var aa = null;
      var n = null;
      this.state = 'show';
      switch( this.orient ){

      case 'n':
        n = sr.y + sr.height;
        aa = { x: sr.x,
               y: 0,
               width: sr.width,
               height: n };
        this.step = - Math.round( n / steps );
        this.y[2] = sr.y - n;
        this.axis = 'y';
        break;

      case 'e':
        n  = wr.width - sr.x;
        aa = { x: sr.x,
               y: sr.y,
               width:  n,
               height: sr.height };
        this.step = Math.round( n / steps);
        this.x[2] = wr.width;
        this.axis = 'x';
        break;

      case 's':
        n = wr.height - sr.y;
        aa = { x: sr.x,
               y: sr.y,
               width: sr.width,
               height: n };
        this.step = Math.round( n / steps);
        this.y[2] = wr.height;
        this.axis = 'y';
        break;

      case 'w':
        n = sr.width + sr.x;
        aa = { x: 0,
               y: sr.y,
               width: n,
               heigh: sr.height };
        this.step = -Math.round(n / steps );
        this.y[x] = sr.x - n;
        this.axis = 'x';
        break;
      };
      
      var areaRect = null;
      var area = new dtk.Area( aa );
      var self = this;
      area.addEventListener('mouseover', function(){ self.show() });
      area.addEventListener('mouseout', function(){ self.hide() });
      this.area = area;
    },

    show: function(){
      if( this.state == 'show' ) return;
      this.state = 'show';
      var self = this;
      var step = self.axis == 'x' ? function(){

        var x = self.x[0] - self.step;
        var y = self.y[0];
        self.x[0] = x;
        self.sprite.moveTo( x , y );
        return ( self.step < 0 ? (x >= self.x[1]) : (x <= self.x[1]));

      } : function(){
        var x = self.x[0];
        var y = self.y[0] - self.step;
        self.y[0] = y;
        self.sprite.moveTo( x , y );
        return ( self.step < 0 ? (y >= self.y[1]) : (y <= self.y[1]));
      };

      self.sprite.show();
      self.sprite.moveTo( self.x[0], self.y[0] );
      (function(){
        if( self.state != 'show' ) return;
        if( step() ){
          self.sprite.moveTo( self.x[1], self.y[1] );
        } else {
          setTimeout( arguments.callee, 0 );
        }
      })();
    },

    hide: function(){
      if( this.state == 'hide' ) return;
      this.state = 'hide';
      var self = this;
      var step = self.axis == 'x' ? function(){
        var x = self.x[0] + self.step;
        var y = self.y[0];
        self.x[0] = x;
        self.sprite.moveTo( x , y );
        return ( self.step < 0 ? (x <= self.x[2]) : (x >= self.x[2]));

      } : function(){
        var x = self.x[0];
        var y = self.y[0] + self.step;
        self.y[0] = y;
        self.sprite.moveTo( x , y );
        return ( self.step < 0 ? (y <= self.y[2]) : (y >= self.y[2]));
      };

      (function(){
        if( self.state != 'hide' ) return;
        if( step() ){
          self.sprite.moveTo( self.x[2], self.y[2] );
          self.sprite.hide();
        } else {
          setTimeout( arguments.callee, 0 );
        }
      })();
    }
  });

})();
