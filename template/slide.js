(function(){

  var FADE_STEP = 0.16;

  ////////////////////////////////////////////////////////////
  // from http://lowreal.net/logs/2006/03/16/1

  var $X = function (exp, context) {
    if (!context) context = document;
    var resolver = function (prefix) {
      var nsr = document.createNSResolver(context);
      var o   = typeof nsr == 'function' ? nsr(prefix) : null;
      return o ? o : (document.contentType == "text/html")
      ? "" : "http://www.w3.org/1999/xhtml";
    }
    var exp = document.createExpression(exp, resolver);
    var result = exp.evaluate(context, XPathResult.ANY_TYPE, null);
    switch (result.resultType) {
    case XPathResult.STRING_TYPE : return result.stringValue;
    case XPathResult.PANGENUMBER_TYPE : return result.pangenumberValue;
    case XPathResult.BOOLEAN_TYPE: return result.booleanValue;
    case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
      {
        result = exp.evaluate(context,
                              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var ret = [];
        for (var i = 0, len = result.snapshotLength; i < len ; i++) {
          ret.push(result.snapshotItem(i));
        }
        return ret;
      }
    }
    return null;
  }


  ////////////////////////////////////////////////////////////
  // Slide classes and
  ////////////////////////////////////////////////////////////

  var Page  = KaeL.oo.Class( {

    initialize: function( elem, pos, all ){
      this.pageNum = pos;
      this.slide   = all;
      this.state   = null;
      this.elem    = elem;
      this.hide();
      var title    = ( $X('string(.//h2)' , this.elem) ||
                       $X('string(.//h1)' , this.elem) );
      this.title   = title;
    },

    show: function(){
      var self = this;
      if( this.state == 'show' ) return;
      this.state = 'show';
      var style = this.elem.style;
      var op    = 0;
      style.display = 'block';
      (function(){
        if( self.state != 'show' ) return;
        style.MozOpacity = Math.min(1, op);
        op += FADE_STEP;
        if( op < 1) setTimeout( arguments.callee , 10 );
      })();
    },

    hide: function(){
      var self = this;
      if(this.state == 'hide') return;
      this.state = 'hide';
      var style = this.elem.style;
      var op    = 1;

      (function(){
        if( self.state != 'hide') return;
        style.MozOpacity = Math.min(1, op);
        op -= FADE_STEP;
        if( op > 0) {
          setTimeout( arguments.callee , 0 );
        } else {
          style.display = 'none';
        }
      })();
    }

  } );

  ////////////////////////////////////////////////////////////
  var Slides = KaeL.oo.Class( {

    initialize: function( src ){
      var pages = [];
      for( var i = 0, l = src.length; i < l ; i++) {
        pages[i] = new Page( src[i], i , this );
      }

      this.pages = pages;
      this.page(0).show();
    },

    page: function( n ){ return this.pages[ n ];  },
    length: function( ){ return this.pages.length; },

  } );


  ////////////////////////////////////////////////////////////

  var PageSlider = KaeL.oo.Class( {
    initialize: function( slide, base ){
      var slider = new dtk.IntSlider( { base: base,
                                         min: 0,
                                         max: slide.length() - 1 } );

      this.cancelSliderEventHandling = false;
      var self = this;
      var ts   = dtk.defaultTileSet;
      var balloon = new dtk.Balloon({ x:0,
                                  y:0,
                                  tiles:ts.tiles('whiteBalloon')} );
      balloon.content.elem.className = 'page-indicator';
      balloon.hide();
      this.balloon = balloon;
      slider.addEventListener('move',    function(e){ self.adjustBalloon()});
      slider.addEventListener('action',  function(e){
        self.adjustBalloon();
        balloon.content.setHTML( '<span class="current">' +
                                 (slider.value + 1 ) +
                                 '</span>/' + ( slide.length() ) +
                                 '<br>'  + slide.page( slider.value ).title
                                 );
        slide.showPage( slider.value );
      });
      slider.addEventListener('mouseup', function(e){ self.adjustBalloon()});
      slider.addEventListener('hide',    function(e){ balloon.hide(); });
      slider.addEventListener('show', function(e){
        balloon.show();
        self.adjustBalloon();
      });

      this.intSlider = slider;
      this.slide = slide;

      for( var f in slider ) {
        if( f in this ) continue;
        if( !( slider[f] instanceof Function  ) ) continue;
        this[f] = (function(f){
          return function(){
            return this.intSlider[f].apply( this.intSlider,  arguments )
          };
        })(f);
      }
    },

    adjustBalloon: function(){
      if( this.cancelSliderEventHandling ) return;
      var balloon = this.balloon;
      var r = this.intSlider.base.knob.rectangle();
      balloon.moveTo( r.x, r.y  );
    },

    adjustWithSlide: function(){
      this.intSlider.adjust( this.slide.page().pageNum );
    }
  } );

  ////////////////////////////////////////////////////////////
  var SlideViewer = KaeL.oo.Class({
    initialize: function( src ){
      var self = this;
      var slide = new Slides( src );
      this.slide = slide;
      this.pageNum = 0;
      this.initSlider();

      dtk.WM.addKeyListener('left', 'keydown', function(e){
        if(e.shiftKey) self.first(); else  self.prev()
        self.slider.adjustWithSlide();
        return true;
      });

      dtk.WM.addKeyListener('right', 'keydown', function(e){
        if(e.shiftKey){ self.last(); } else { self.next() }
        self.slider.adjustWithSlide();
        return true;
      });

      dtk.WM.addKeyListener(' ', 'keydown', function(e){
        self.sPeekABoo.hide();
        return true;
      });


      dtk.WM.addEventListener('resize', function(e){
        self.slider.hide();
        self.sPeekABoo.dispose();
        self.initSlider();
      });


    },

    initSlider: function(){
      var wr = dtk.WM.rectangle();
      var tileset  = dtk.defaultTileSet;
      var slider =
        new PageSlider
        ( this ,
          new dtk.HSlider({ position:'fixed',
                                   x:  Math.round(wr.width * (5 / 18)),
                                   y:   -20,
                                   z:  2000,
                               value:  this.pageNum,
                               width:  Math.round(wr.width * (8 / 18)),
                              height:    20,
                               tiles: tileset.tiles('hslider')}));
      this.sPeekABoo = new dtk.PeekABoo({ sprite: slider,
                                          orient: 's' });
      this.slider = slider;
      this.sPeekABoo.hide();
    },

    run: function(){},

    length: function(){
      return this.slide.length.apply( this.slide, arguments );
    },

    page:   function( n ){
      return this.slide.page( n ||  this.pageNum );
    },

    next: function( ){
      var num = this.page().pageNum;
      if( num == this.length() - 1 ){
        this.showPageNum();
      } else {
        this.page().hide();
        this.pageNum = num + 1;
        this.page().show();
      }
    },

    prev: function( ){
      var num = this.page().pageNum;
      if( num == 0 ){
        this.showPageNum();
      } else {
        this.page().hide();
        this.pageNum = num - 1;
        this.page().show();
      }
    },

    first: function(){
      this.page().hide();
      this.pageNum = 0;
      this.page().show();
      this.showPageNum();
    },

    last: function(){
      this.page().hide();
      this.pageNum = this.length() - 1;
      this.page().show();
      this.showPageNum();
    },

    showPage: function(n){
      if( this.pageNum == n ) return;
      this.page().hide();
      this.pageNum = n;
      this.page(n).show();
    },

    showPageNum: function(){
      this.sPeekABoo.show();
    },

  });


  ////////////////////////////////////////////////////////////
  //            Entry point of this apprication             //
  ////////////////////////////////////////////////////////////
  KaeL.dhtml.addEventListener(window, 'load', function(){
    dtk.WM.initialize();
    (new SlideViewer($X("//h:div[contains(string(@class),'slide')]"))).run();
  });

})();
