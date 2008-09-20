package{

  import flash.system.*;
  import flash.utils.*;
  import flash.display.*;
  import flash.geom.*;
  import flash.text.*;
  import flash.events.*;
  import com.hurlant.util.Base64;
  import flash.external.ExternalInterface;
  import net.kaourantin.*;
  import flash.net.*;

  public class JSHelper extends Sprite{

    public function JSHelper (){

      with(ExternalInterface){
        addCallback('withClippedImage', function(url:String,
                                          x:int,y:int,w:int,h:int,
                                          continuation:String):void{
          withClippedImage(url,
                    x,y,w,h,function( uri:String ):void{
            call( continuation, uri );
          });
        });

        addCallback('available', function():void{});

      }
    }

    public static function withClippedImage( url:String, 
                                      x:int,y:int,w:int,h:int, 
                                      continuation: Function ):void{
      withLoading( url, function( source:Bitmap ):void{
        var bd:BitmapData = new BitmapData(w, h, true, 0);
        var mtx:Matrix = new Matrix;
        mtx.translate(-x, -y);
        bd.draw( source, mtx,null,null, new Rectangle( 0, 0, w,h ));
        var png:ByteArray = PNGEnc.encode( bd );
        var uri:String = 'data:image/png;base64,' +
          Base64.encodeByteArray(png);
        continuation( uri );
      });
    }

    private static var bitmaps:Object = {};

    private static function withLoading(url:String,
                                        continuation:Function):void{

      if( bitmaps[url] ){
        continuation( bitmaps[url] );
        return;
      }

      var ldr:Loader   = new Loader();
      ldr.contentLoaderInfo.addEventListener( Event.INIT, function():void{
        bitmaps[url] = ldr.content;
        continuation( ldr.content );
      });

      if( url.match(/^data:/)) {

        var b64:String   = url.replace(/^[^,]*,/,'');
        var ba:ByteArray = Base64.decodeToByteArray( b64 );
        ldr.loadBytes( ba );

      } else {
        try{
          ldr.load( new URLRequest( url ) );
        } catch ( e:* ){
          log( e );
        }
      }
    }
  }
}
