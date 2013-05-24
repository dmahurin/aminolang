/*
add this to the out.js file
exports.GFX = GFX;
exports.Node = Node;
exports.Point = Point;
*/

var http = require('http');
var url = require('url');
var fs = require('fs');
var child_process = require('child_process');
// 'extend' is From Jo lib, by Dave Balmer
// syntactic sugar to make it easier to extend a class
Function.prototype.extend = function(superclass, proto) {
	// create our new subclass
	this.prototype = new superclass();
	/*

	// optional subclass methods and properties
	if (proto) {
		for (var i in proto)
			this.prototype[i] = proto[i];
	}
	*/
};


//String extension
if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

function ParseRGBString(Fill) {
    if(typeof Fill == "string") {
        //strip off any leading #
        if(Fill.substring(0,1) == "#") {
            Fill = Fill.substring(1);
        }
        //pull out the components
        var r = parseInt(Fill.substring(0,2),16);
        var g = parseInt(Fill.substring(2,4),16);
        var b = parseInt(Fill.substring(4,6),16);
        //turn into a Color object
        return new Color(r/255,g/255,b/255);
    }
    //else pass through
    return Fill;
}

var generated;
var widgets;
var amino;
var PNG;

var OS = "KLAATU";
if(process.platform == "darwin") {
    OS = "MAC";
}
if(OS == "MAC") {
    generated = require('./out.js');
    amino = require("./amino.node");
    widgets = require('./widgets.js');
} else {
    console.log("about to load amino");
    amino = require('/data/phonetest/aminonative');
    console.log("loaded up here");
    generated = require('/data/phonetest/out.js');
    PNG = require('/data/phonetest/png-node.js');
}


var Point = generated.Point;
var core = amino.createCore();
core.testNative = amino.testNative;
core.loadJpegFromBuffer = amino.loadJpegFromBuffer;



function decodeImage (width, height, buffer, done)
{
    var image =
    {
        width   : width,
        height  : height,
        buffer  : new Buffer(width * height * 4)
    };

    var cmd = "convert"
    var args = [
        "-format", "rgba",
        "-depth", "8",
        "-size", width + "x"  + height,
        "-",
        "rgba:-"
    ];        
    
    var child = child_process.spawn(cmd, args);
    
    var received = 0;
    child.stdout.on("data", function (data) {
        data.copy(image.buffer, received);
        received += data.length;
    });
    child.stderr.on("data", function (data) {
        console.log(data.toString());
    });
    
    child.on("exit", function (code) {
        done(null, image);
    });
    
    child.stdin.write(buffer);
    child.stdin.end();
}



// Keyboard setup

var KEY_TO_CHAR_MAP = {};
//lower symbols
for(var i=32; i<=64; i++) {
    KEY_TO_CHAR_MAP[i]= String.fromCharCode(i);
}
//letters
for(var i=65; i<=90; i++) {
    KEY_TO_CHAR_MAP[i]= String.fromCharCode(i+32);
}
//upper symbols
KEY_TO_CHAR_MAP[91]=String.fromCharCode(91);
KEY_TO_CHAR_MAP[92]=String.fromCharCode(92);
KEY_TO_CHAR_MAP[93]=String.fromCharCode(93);
KEY_TO_CHAR_MAP[96]=String.fromCharCode(96);
//console.log(KEY_TO_CHAR_MAP);
var SHIFT_MAP = {};
//capital letters
for(var i=97; i<=122; i++) {
    SHIFT_MAP[String.fromCharCode(i)] = String.fromCharCode(i-32);
}
SHIFT_MAP['1'] = '!';
SHIFT_MAP['2'] = '@';
SHIFT_MAP['3'] = '#';
SHIFT_MAP['4'] = '$';
SHIFT_MAP['5'] = '%';
SHIFT_MAP['6'] = '^';
SHIFT_MAP['7'] = '&';
SHIFT_MAP['8'] = '*';
SHIFT_MAP['9'] = '(';
SHIFT_MAP['0'] = ')';

SHIFT_MAP['-'] = '_';
SHIFT_MAP['='] = '+';
SHIFT_MAP['['] = '{';
SHIFT_MAP[']'] = '}';
SHIFT_MAP['\\'] = '\|';
SHIFT_MAP['`'] = '~';


SHIFT_MAP[';'] = ':';
SHIFT_MAP['\''] = '\"';

SHIFT_MAP[','] = '<';
SHIFT_MAP['.'] = '>';
SHIFT_MAP['/'] = '?';
//console.log(SHIFT_MAP);



function JSStage() {
    this.width = core.DEFAULT_WIDTH;
    this.height = core.DEFAULT_HEIGHT;
    
    this.setSize = function(w,h) {
        this.width = w;
        this.height = h;
    }
    this.listeners = {};
    this.on = function(name, target, fn) {
        name = name.toLowerCase();
        if(target == null) {
            target = this;
        }
        if(!this.listeners[name]) {
            this.listeners[name] = [];
        }
        var list = this.listeners[name];
        list.push({target:target, fn:fn});
    }
    
    this.anims = [];
    this.addAnim = function(anim) {
        this.anims.push(anim);
    }
    this.processAnims = function() {
        for(var i in this.anims) {
            this.anims[i].update();
        }
    }
    
    
    this.fireEvent = function(e) {
        // console.log("firing",e);
        // console.log(this.listeners);
        if(this.listeners[e.type.toLowerCase()]) {
            // console.log("got a list");
            var list = this.listeners[e.type.toLowerCase()];
            for(var i in list) {
                var l = list[i];
                if(l.target == e.target) l.fn(e);
            }
        }
    }
    this.createEvent = function() {
        return {};
    }
    
    this.keyboardFocus = null;
    this.getKeyboardFocus = function(){
        return this.keyboardFocus;
    }
    this.setKeyboardFocus = function(KeyboardFocus){
        this.keyboardFocus=KeyboardFocus;
        //this.markDirty();
        return this;
    }
    
    
    this.root = null;
    this.setRoot = function(root) {
        this.root = root;
    }
    this.getRoot = function() {
        return this.root;
    };
    
    var self = this;
    //var repaintTimer = new SpeedTimer("Stage.draw");
    this.draw = function(gfx)  {
        //repaintTimer.start(); 
        
        var wgfx = {
            fillQuadColor: function(c,b) {
                //console.log("filling with color");
                gfx.fillQuadColor(ParseRGBString(c),b);
            },
            fillQuadText: function(color, str, x, y, size, fontid) {
                //console.log("fillQuadText: ",color,str,x,y,size,fontid);
                if(!str) str = "ERROR";
                if(!size) size = 20;
                if(fontid == undefined) fontid = -1;
                gfx.fillQuadText(ParseRGBString(color),str,x,y,size,fontid);
            },
            fillQuadTexture: function() {
                gfx.fillQuadTexture(arguments);
            },
            fillQuadTextureSlice: gfx.fillQuadTextureSlice,
            //enableClip:gfx.enableClip,
            //disableClip:gfx.disableClip
            fillRect: function(color, bounds) {
                this.fillQuadColor(color,bounds);
            },
            strokeRect: function(color, bounds) {
                gfx.strokeQuadColor(ParseRGBString(color),bounds);
            },
            drawText: function(color, text, x, y, size, font) {
                var scale = size/font.basesize;
                this.fillQuadText(color, text, 
                    x, 
                    y-font.ascent*scale - 10*scale, 
                    size, font.fontid);
            },
        };
        
        function delegate(obj, name, del) {
            obj[name] = function() { del[name].apply(del,arguments); }
        }
        
        //just delegate the rest of them directly
        delegate(wgfx,"translate",gfx);
        delegate(wgfx,"scale",gfx);
        delegate(wgfx,"rotate",gfx);
        delegate(wgfx,"save",gfx);
        delegate(wgfx,"restore",gfx);
        
        self.processAnims();
        if(core.SCALE2X) wgfx.scale(2,2);
        self.draw_helper(wgfx,self.root);
        
        //repaintTimer.end();
    }
    
    this.draw_helper = function(ctx, root) {
        if(!root.getVisible()) return;
        ctx.save();
        ctx.translate(root.getTx(),root.getTy());
        root.draw(ctx);
        
        if(root instanceof generated.Transform) {
            ctx.scale(root.getScalex(),root.getScaley());
            ctx.rotate(root.getRotate());
        }
        
        if(root.isParent && root.isParent()) {
            for(var i=0; i<root.getChildCount(); i++) {
                this.draw_helper(ctx,root.getChild(i));
            }
        }
        ctx.restore();
    }
    
    this.processEvents = function(e) {
        var x = e.x;
        var y = e.y;
        if(e.type == "key") {
            self.processRawKeyEvent(e);
            return;
        }
        if(e.type == "press") {
            self.processPointerEvent("PRESS", new Point(x,y));
            return;
        }
        if(e.type == "release") {
            self.processPointerEvent("RELEASE", new Point(x,y));
            return;
        }
        if(e.type == "drag") {
            self.processPointerEvent("DRAG",new Point(x,y));
            return;
        }
        
        //skip move events for now
        if(e.type == "move") {
            return;
        }
        
        if(e.type == "windowsize") {
            self.processWindowSizeEvent(e);
            return;
        }
        console.log("unhandled event:",e);
    }
    
    this.processWindowSizeEvent = function(e) {
        this.width = e.width;
        this.height = e.height;
        this.fireEvent({type:"WINDOWSIZE",width:this.width, height:this.height, target: this});
    }
    
    var self = this;
    this.repeatEvent = null;
    this.repeatTimeout = null;
    this.repeatKey = function() {
        self.fireEvent(self.repeatEvent);
        self.repeatTimeout = setTimeout(self.repeatKey, 20);
    }
    this.processRawKeyEvent = function(e) {
        console.log("key event:",e);
        if(this.repeatTimeout) {
            clearTimeout(this.repeatTimeout);
            this.repeatTimeout = null;
            this.repeatEvent = null;
        }
        var event = this.createEvent();
        if(e.action == 1) {
            event.type = "KEYPRESS";
            event.keycode = e.keycode;
            event.shift = (e.shift == 1);
            event.system = (e.system == 1);
            if(KEY_TO_CHAR_MAP[e.keycode]) {
                var ch = KEY_TO_CHAR_MAP[e.keycode];
                if(e.shift == 1) {
                    if(SHIFT_MAP[ch]) {
                        ch = SHIFT_MAP[ch];
                    }
                }
                
                event.printableChar = ch;
                event.printable = true;
            }
            if(this.keyboardFocus != null) {
                event.target = this.keyboardFocus;
                this.repeatTimeout = setTimeout(this.repeatKey,300);
                this.repeatEvent = event;
                this.fireEvent(event);
            }
        }
    }
    
    this.mouselast = new Point(0,0);
    this.processPointerEvent= function(type, point) {
        //console.log("processing a pointer event " + type + " ", point);
        type = type.toLowerCase();
        var event = this.createEvent();
        event.type = type;
        console.log("type = " + event.type + " " + this.mouselast.x + " " + this.mouselast.y);
        if(type == "press") {
            event.point = point;
        }
        if(type == "drag") {
            event.delta = point.minus(this.mouselast);
            if(core.SCALE2X) {
                event.delta.x = event.delta.x/2;
                event.delta.y = event.delta.y/2;
            }
            event.point = point;
        }
        var node = this.findNodeByXY(point);
        var pt2 = fromScreenCoords(point);
        event.point = pt2;
        
        if(type=="press"){
            this.dragFocus = node;
            this.keyboardFocus = node;
        }
        if(type=="drag") {
            if(this.dragFocus != null) {
                node = this.dragFocus;
            }
        }
        if(type=="release"){
            this.dragFocus = null;
        }
        if(node!=null){
            event.target = node;
            this.fireEvent(event)
        }
        this.mouselast = point;        
        
        //send a second drag to the stage just for swipe events
        if(type == "drag") {
            event.target = this;
            this.fireEvent(event);
        }
    }
    function fromScreenCoords(point) {
        var x = point.x;
        var y = point.y;
        
        if(core.SCREEN_ROTATE) {
            var th = 90/180*Math.PI;
            var x2 =  x*Math.cos(th) + y*Math.sin(th);
            var y2 = -x*Math.sin(th) + y*Math.cos(th);
            return new Point(x2,800+y2);
        }
        
        if(core.SCALE2X) {
            var x2 = x/2;
            var y2 = y/2;
            return new Point(x2,y2);
        }
        
        return new Point(x,y);
    }
    this.findNodeByXY = function(point) {
        var pt2 = fromScreenCoords(point);
//        console.log("about to find a node for point "
//            + point.x + ","+ point.y + " -> " + pt2.x + ","+pt2.y);
        return this.real_findNodeByXY(this.root,pt2);
    }
    this.real_findNodeByXY = function(node, point) {
        if(!node) return null;
        if(node.getVisible && !node.getVisible()) return null;
        var pt2 = new Point(point.x,point.y);
        
        /*
        if(node instanceof Transform) {
            pt2 = node.toInnerCoords(pt2);
        } else {
            pt2 = new Point(pt2.x-node.getTx(),pt2.y-node.getTy());
        }
        */
        pt2 = new Point(pt2.getX()-node.getTx(),pt2.getY()-node.getTy());
        
        
        if(node.isParent && node.isParent()) {
            //go in reverse, front to back
            for(var i=node.getChildCount()-1; i>=0; i--) {
                var ret = this.real_findNodeByXY(node.getChild(i),pt2);
                if(ret != null) return ret;
            }
        }
        if(!node.contains) {
            console.log("WARNING! Node is missing contains method");
        }
        if(node.contains && node.contains(pt2)) {
            return node;
        }
        return null;
    }    
    
    this.find = function(id) {
        return this.findNodeById_helper(id,this.getRoot());
    }
    this.findNodeById_helper = function(id, node) {
        if(node.id && node.id == id) return node;
        if(node.isParent && node.isParent()) {
            for(var i=0; i<node.getChildCount(); i++) {
                var ret = this.findNodeById_helper(id,node.getChild(i));
                if(ret != null) return ret;
            }
        }
        return null;
    }
    
    this.loadTexture = function(path, w, h, cb) {
        if(!core.started) {
            throw "Can't load a texture before core is started";
        }
        if(path.toLowerCase().endsWith(".jpg"))  {
            console.log("doing a jpeg");
            this.loadLocalJPG(path,w,h,cb);
            return;
        } 
        PNG.decode(path, function(pixels) {
            var texid = amino.loadTexture(pixels,w, h);
            cb(texid);
        });
    }
    this.loadLocalJPG = function(path, w, h, cb) {
        var buf = fs.readFileSync(path);
        decodeImage(w,h,buf,function(err,img) {
            var texid = amino.loadTexture(img.buffer,w,h);
            cb(texid);
        });
    };
    
    this.loadRemoteTexture = function(path, w, h, cb) {
        var options = url.parse(path);
        options.encoding = null;
        http.request(options, function(res) {
                var buffers = [];
                res.on("data",function(d) {
                    buffers.push(d);
                });
                res.on("end", function() {
                    var buf = Buffer.concat(buffers);
                    decodeImage(75,75,buf,function(err, img) {
                            var texid = amino.loadTexture(img.buffer,75,75);
                            cb(texid);
                    });
                });
        }).end();
    }
    
    this.loadSong = function(path) {
        console.log("loading a SONG: " + path);
        var song = amino.createMediaPlayer(path);
        song.playing = false;
        song.isPlaying = function() {
            return song.playing;
        }
        song.stop = function() {
            song.cpp_stop();
            song.playing = false;
        }
        song.play = function() {
            song.cpp_start();
            song.playing = true;
        }
        song.pause = function() {
            song.playing = false;
            song.cpp_pause();
        }
        return song;
    }
}

function JSRect() {
    this.parent;
    this.getParent = function(){
        return this.parent;
    }
    this.setParent = function(Parent){
        this.parent=Parent;
        this.markDirty();
        return this;
    }
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    
    this.getX = function(){
        return this.x;
    }
    this.setX = function(X){
        this.x=X;
        this.markDirty();
        return this;
    }
    this.getY = function(){
        return this.y;
    }
    this.setY = function(Y){
        this.y=Y;
        this.markDirty();
        return this;
    }
    this.setW = function(w) {
        this.w = w;
        return this;
    };
    this.getW = function() {
        return this.w;
    };
    
    this.setH = function(h) {
        this.h = h;
        return this;
    };
    this.getH = function() {
        return this.h;
    };
    this.getFill = function(){
        return this.fill;
    }
    this.setFill = function(Fill){
        this.fill = Fill;
        this.markDirty();
        return this;
    }
    this.setFill("#888888");
    
    var self = this;
    this.draw = function(gfx) {
        if(self.strokeWidth) {
            var border = self.getBounds();
            border.x--;
            border.y--;
            border.w+=2;
            border.h+=2;
            
            gfx.fillQuadColor(new Color(0,0,0), border); 
        }
        gfx.fillQuadColor(self.getFill(),self.getBounds());
    };
    this.getBounds = function() {
        return {x:self.x, y:self.y, w:self.w, h:self.h };
    };
    this.contains = function(pt){
        if(pt.x<this.x){
            return false;}
        ;
            if(pt.x>this.x+this.w){
            return false;}
        ;
            if(pt.y<this.y){
            return false;}
        ;
            if(pt.y>this.y+this.h){
            return false;}
        ;
        return true;
    }
}
JSRect.extend(generated.Node);

core.createStage = function() {
    this.stage = new JSStage();
    return this.stage;
}

core.createRect = function() {
    return new JSRect();
}



function Color(r,g,b) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.getRFloat = function() {
        return this.r;
    }
    this.getGFloat = function() {
        return this.g;
    }
    this.getBFloat = function() {
        return this.b;
    }
}

function JSGroup() {
    this.nodes = [];
    this.add = function(child) {
        if(child == null) {
            console.log("ERROR. tried to add a null child to a group");
            return;
        }
        this.nodes.push(child);
        child.setParent(this);
        this.markDirty();
    }
    this.isParent = function() { return true; }
    this.getChildCount = function() {
        return this.nodes.length;
    }
    this.getChild = function(i) {
        return this.nodes[i];
    }
    this.toInnerCoords = function(pt){
            return pt;
    }
    this.visible = true;
    this.getVisible = function(){
        return this.visible;
    }
    this.setVisible = function(visible){
        this.visible=visible;
        this.markDirty();
        return this;
    }
    this.draw = function(ctx) {
    }
    this.remove = function(target) {
        var n = this.nodes.indexOf(target);
        this.nodes.splice(n,1);
    }
    this.clear = function() {
        this.nodes = [];
    }
}
JSGroup.extend(generated.Node);

core.createGroup = function() {
    return new JSGroup();
}


function JSTransform() {
    this.isParent = function() {        return true; }
    this.getChildCount = function() {   return 1;  }
    this.setChild = function(ch) {
        this.child = ch;
        this.child.setParent(this);
    }
    this.getChild = function(i) {       return this.child;   }
    this.toInnerCoords = function(pt) {
        //console.log("turning ", pt2);
        var pt2 = new Point(
            pt.x-this.getTx(),
            pt.y-this.getTy()
            );
        //console.log("to ",pt2);
        pt2 = new Point( pt2.x/this.getScalex(), pt2.y/this.getScaley());
        //console.log("to ", pt2);
        var theta = this.getRotate()/180*Math.PI;
        //console.log("cos of theta = " + node.getRotate() + " " + theta + " " + Math.cos(theta));
        pt2 = new Point(
            (Math.cos(theta)*pt2.x + Math.sin(theta)*pt2.y),
            (-Math.sin(theta)*pt2.x + Math.cos(theta)*pt2.y)
            );
        return pt2;
        //console.log("to ", pt2);
//            console.log("theta = " + (Math.cos(theta)*pt2.x + Math.sin(theta)*pt2.y));
//            console.log("theta = " + (Math.sin(theta)*pt2.x - Math.cos(theta)*pt2.y));
    }
    this.type = "Transform";
}
JSTransform.extend(generated.Transform);
core.createTransform = function() {
    var comp = new JSTransform();
    comp.type = "Transform";
    return comp;
}

JSAnchorPanel = function() {
    this.nodes = [];
    this.isParent = function() { return true; }
    this.getChildCount = function() {
        return this.nodes.length;
    }
    this.getChild = function(i) {
        return this.nodes[i];
    }
    this.add = function(child) {
        if(child == null) {
            console.log("ERROR. tried to add a null child to a group");
            return;
        }
        this.nodes.push(child);
        child.setParent(this);
        this.markDirty();
    };
    this.draw = function(gfx) {
        var border = self.getBounds();
        border.x--;
        border.y--;
        border.w+=2;
        border.h+=2;
        gfx.fillQuadColor("#000000", border);
        gfx.fillQuadColor(this.getFill(),this.getBounds());
    };    
    var self = this;
    this.getBounds = function() {
        return {x:this.x, y:this.y, w:this.w, h:this.h };
    };
    this.setW = function(w) {
        this.w = w;
        this.redoLayout();
        this.markDirty();
        return this;
    }
    this.setH = function(h) {
        this.h = h;
        this.redoLayout();
        this.markDirty();
        return this;
    }
    this.redoLayout = function() {
        for(var i in this.nodes) {
            var node = this.nodes[i];
            //top aligned
            if(node.anchorTop && !node.anchorBottom) {
                node.setTy(node.top);
            }
            //bottom aligned
            if(node.anchorBottom && !node.anchorTop) {
                node.setTy(this.getH() - node.bottom - node.getH());
            }
            //left aligned
            if(node.anchorLeft && !node.anchorRight) {
                node.setTx(node.left);
            }
            //right aligned
            if(node.anchorRight && !node.anchorLeft) {
                node.setTx(this.getW() - node.right - node.getW());
            }
            
            //horizontal stretch
            if(node.anchorRight && node.anchorLeft) {
                node.setTx(node.left);
                node.setW(this.getW()- node.left - node.right);
            }
            //vertical stretch
            if(node.anchorTop && node.anchorBottom) {
                node.setTy(node.top);
                node.setH(this.getH() - node.top - node.bottom);
            }
        }
    }
}
JSAnchorPanel.extend(generated.AnchorPanel);
core.createAnchorPanel = function() {
    var comp = new JSAnchorPanel();
    comp.setFill("#cccccc");
    return comp;
}

widgets.CommonListView.extend(generated.ListView);
core.createListView = function() {
    var comp = new widgets.CommonListView();
    comp.font = this.DEFAULT_FONT;
    comp.install(this.stage);
    return comp;
}

widgets.CommonPushButton.extend(generated.PushButton);
core.createPushButton = function() {
    var comp = new widgets.CommonPushButton();
    comp.font = this.DEFAULT_FONT;
    comp.install(this.stage);
    return comp;
}


widgets.CommonToggleButton.extend(generated.ToggleButton);
core.createToggleButton = function() {
    var comp = new widgets.CommonToggleButton();
    comp.font = this.DEFAULT_FONT;
    comp.install(this.stage);
    return comp;
}

widgets.CommonLabel.extend(generated.Label);
core.createLabel = function() {
    var comp = new widgets.CommonLabel();
    comp.font = this.DEFAULT_FONT;
    comp.install(this.stage);
    return comp;
}

function JSFont(jsonpath, pngpath, w, h) {
    //load json
    var jsontext = fs.readFileSync(jsonpath);
    this.json = JSON.parse(jsontext);
    
    var self = this;
    this.loaded = false;
    //load png
    this.loadImage = function() {
        
        console.log("JSFont: loading image: " + pngpath);
        var fontImage = amino.loadPngFromBuffer(pngpath);
        self.fontid = amino.createNativeFont(
            fontImage.texid,
            self.json.minchar,
            self.json.maxchar,
            self.json.included,
            self.json.widths,
            self.json.offsets
            );
        self.loaded = true;
        console.log("JSFont: fully loaded the font with id: " + self.fontid);
        
    }    
    this.calcStringWidth = function(str, size) {
        var total = 0;
        for(var i=0; i<str.length; i++) {
            var ch = str.charCodeAt(i);
            var n = ch - this.json.minchar;
            var w = this.json.widths[n];
            total += w;
        }
        return total * size/this.basesize;
    }
    this.getHeight = function(fs,gfx) {
        return this.json.height * (fs/this.basesize);
    }
    this.getAscent = function(fs,gfx) {
        return this.ascent * (fs/this.basesize);
    }
}
core.fonts = [];
core.createFont = function(jsonpath, pngpath, w, h) {
    var font = new JSFont(jsonpath, pngpath, w, h);
    core.fonts.push(font);
    return font;
}
core.DEFAULT_FONT = core.createFont(__dirname+"/test1.json",__dirname+"/test1.png",2153, 58);
core.DEFAULT_FONT.basesize = core.DEFAULT_FONT.json.size;
core.DEFAULT_FONT.scaledsize = 20;
core.DEFAULT_FONT.ascent = core.DEFAULT_FONT.json.ascent;
core.DEFAULT_FONT.scale = core.DEFAULT_FONT.scaledsize/core.DEFAULT_FONT.basesize
//console.log("DEFAULT_FONT = ", core.DEFAULT_FONT);

// currently text model just uses a string of characters, but it
// exposes only Elements, so it could use other data formats internally
// in the future.
function TextModel() {
    this.listeners = [];
    this.text = "this is some text";
    this.setText = function(text) {
        this.text = text;
        this.broadcast();
    }
    this.getElementAt = function(n) {
        var ch = this.text.substring(n,n+1);
        return {
            text:ch,
            newline: (ch == '\n'),
            whitespace: (ch == ' '),
        }
    }
    this.getText = function() {
        return this.text;
    }
    
    this.getLength = function() {
        return this.text.length;
    }
    this.insertAt = function(text, index) {
        this.text = this.text.substring(0,index) + text + this.text.substring(index);
        this.broadcast();
    }
    this.deleteAt = function(count, index) {
        if(index - count < 0) return false;
        this.text = this.text.substring(0,index-1) + this.text.substring(index);
        this.broadcast();
        return true;
    }
    this.listen = function(listener) {
        this.listeners.push(listener);
    }
    this.broadcast = function() {
        var self = this;
        this.listeners.forEach(function(listener) {
            listener.notify(self);
        });
    }
}
function StyleModel() {
    this.runs = [];
    /*
    this.runs.push({
            start: 5,
            end: 10,
            color: new amino.Color(0,1,0),
    });
    
    this.runs.push({
            start:20,
            end: 25,
            color: new amino.Color(0,0,1),
    });
    
    
    this.runs.push({
            start:40,
            end:-1,
            atomic:true,
            kind:"newline",
    });
    */
    
    this.doesStyleChange = function(n) {
        for(var i=0; i<this.runs.length; i++) {
            if(this.runs[i].start == n) return true;
            if(this.runs[i].end   == n) return true;
        }
        return false;
    }
    this.colorAt = function(n) {
        for(var i=0; i<this.runs.length; i++) {
            var run = this.runs[i];
            if(n >= run.start && n < run.end) {
                if(run.color) {
                    return run.color;
                }
            }
        }
        return new Color(0,0,0);
    }
    
    this.insertAt = function(text, index) {
        var len = text.length;
        this.model.insertAt(text,index);
        var n = index;
        for(var i=0; i<this.runs.length; i++) {
            var run = this.runs[i];
            //before the run
            if(n < run.start) {
                run.start += len;
                run.end += len;
            }
            //inside the run
            if(n >= run.start && n < run.end) {
                run.end += len;
            }
        }
    }
    this.deleteAt = function(count, index) {
        var deleted = this.model.deleteAt(count, index);
        if(!deleted) return;
        var n = index;
        var toremove = [];
        for(var i=0; i<this.runs.length; i++) {
            var run = this.runs[i];
            if(n < run.start) {
                run.start -= count;
                run.end   -= count;
                continue;
            }
            if(n == run.start && run.atomic) {
                toremove.push(run);
                continue;
            }
            if(n == run.start && run.end <= run.start) {
                toremove.push(run);
                continue;
            }
            if(n >= run.start && n < run.end) {
                run.end   -= count;
                continue;
            }
        }
        var self = this;
        toremove.forEach(function(item) {
            var n = self.runs.indexOf(item);
            self.runs.splice(n,1);
        });
    }
}

function TextView() {
    this.lines = [];
    this.wrapping = true;
    this.setModel = function(model) {
        this.model = model;
        this.model.listen(this);
    }
    this.notify = function(sender) {
        this.layout();
    }
    this.getCharWidth = function(ch) {
        var code = ch.charCodeAt(0);
        var n = code-this.font.json.minchar;
        var w = this.font.json.widths[n];
        return w*this.font.scale;
    }
    this.getCharAt = function(n) {
        return this.model.text.substring(n,n+1);
    }
    this.getElementAt = function(n) {
        var elem = this.model.getElementAt(n);
        elem.width = this.getCharWidth(elem.text);
        if(elem.newline) {
            elem.width = 0;
        }
        return elem;
    }
    
    this.getStringWidth = function(str) {
        var len = 0;
        for(var i=0; i<str.length; i++) {
            len += this.getCharWidth(str[i]);
        }
        return len;
    }
    this.indexToXY = function(n) {
        if(n == 0) return {x:0, y:0};
        for(var i=0; i<this.lines.length; i++) {
            var line = this.lines[i];
            if(line.start <= n && n < line.end) {
                var run = line.runs[0];
                var txt = this.model.text.substring(run.start,n);
                var x = line.x + run.x + this.getStringWidth(txt);
                var y = line.y;
                return {x:x, y:y};
            }
        }
        return { x:0, y:0 };
    }
    this.indexToLineNum = function(n) {
        for(var i=0; i<this.lines.length; i++) {
            var line = this.lines[i];
            if(line.start <= n && n <= line.end) {
                return i;
            }
        }
        return -1;
    }
    this.getLine = function(n) {
        return this.lines[n];
    }
    
    this.control = null;
    this.line = null;
    this.run = null;
    this.y = 0;
    this.w = 0;
    this.lineheight = 50;
    this.endLine = function(n) {
        this.run.end = n+1;
        this.line.end = n+1;
        this.line.runs.push(this.run);
        this.lines.push(this.line);
        this.line.h = this.lineheight;
        this.line.w = this.control.getW();
        this.line = new LineBox();
        this.y+= this.lineheight;
        this.line.y = this.y;
        this.line.start = n+1;
        this.run = new RunBox();
        this.run.color = this.styles.colorAt(n);
        this.run.model = this.model;
        this.run.start = n+1;
        this.w = 0;
    }
    this.layout = function() {
        if(!this.font) return;
        this.lines = [];
        
        this.lineheight = this.font.json.height*this.font.scale;
        
        var n = 0;
        this.w = 0;
        this.y = 0;
        this.line = new LineBox();
        this.line.start = n;
        this.run = new RunBox();
        this.run.model = this.model;
        this.run.color = this.styles.colorAt(n);
        this.run.start = n;
        this.lastspace = -1;
        
        while(true) {
            var ch = this.getElementAt(n);
            if(ch.whitespace) {
                this.lastspace = n;
            }
            
            if(ch.newline) {
                this.endLine(n);
            }
            this.w += ch.width;
            if(this.wrapping && (this.w > this.control.getW() || ch == '\n')) {
                //go back to previous space
                if(this.lastspace >= 0) {
                    n = this.lastspace;
                    this.lastspace = -1;
                }
                this.endLine(n);
            }
            n++;
            if(n >= this.model.getLength()) {
                this.endLine(n);
                break;
            }
        }
        
        this.lines.forEach(function(line) {
            //console.log("line");
            line.runs.forEach(function(run) {
                console.log("   "+run.toString());
            });
        });
    }
}

function LineBox() {
    this.x = 0;
    this.y = 0;
    this.runs = [];
}

function RunBox() {
    this.x = 0;
    this.y = 0;
    this.model = null;
    this.start = 0;
    this.end = 0;
    this.color = new Color(1,0,0);
    this.toString = function() {
        return "run: " + this.model.text.substring(this.start, this.end);
    }
}

function Cursor() {
    this.FORWARD = 0;
    this.BACKWARD = 1;
    this.index = 0;
    this.control = null;
    this.clipboard = "";
    this.bias = this.FORWARD;
    
    this.advanceChar = function(offset) {
        this.index += offset;
        if(this.index < 0) {
            this.index = 0;
            this.bias = this.BACKWARD;
        }
        if(this.index > this.model.getLength()-1) {
            this.index = this.model.getLength()-1;
            this.bias = this.FORWARD;
        }
    }
    
    this.deleteChar = function() {
        if(this.bias == this.FORWARD) {
            this.control.styles.deleteAt(1,this.index+1);
        } else {
            this.control.styles.deleteAt(1,this.index);
        }
        this.advanceChar(-1);
    }
    
    this.insertChar = function(ch) {
        if(this.bias == this.BACKWARD) {
            this.control.styles.insertAt(ch,this.index);
        } else {
            this.control.styles.insertAt(ch,this.index+1);
        }
    }
    
    this.insertNewline = function() {
        if(this.bias == this.BACKWARD) {
            this.control.styles.insertAt('\n',this.index);
            this.bias = this.BACKWARD;
            this.advanceChar(1);
        } else {
            this.control.styles.insertAt('\n',this.index+1);
            this.bias = this.BACKWARD;
            this.advanceChar(1);
        }
    }


    this.selectionActive = function() {
        return (this.control.selection != null);
    }
    this.clearSelection = function() {
        this.control.selection = null;
    }
    this.extendSelection = function(offset) {
        if(!this.control.selection) {
            this.control.selection = new TextSelection();
            this.control.selection.start = this.index;
        }
        this.index += offset;
        this.control.selection.end = this.index;
    }
    this.deleteSelection = function() {
        var sel = this.control.selection;
        var text =  this.control.model.text;
        this.control.model.text = text.substring(0,sel.getStart()) + text.substring(sel.getEnd());
        this.index = sel.getStart();
        this.control.model.broadcast();
    }
    
    this.cutSelection = function() {
        var sel = this.control.selection;
        var text =  this.control.model.text;
        this.clipboard = text.substring(sel.start,sel.end);
        this.control.model.text = text.substring(0,sel.getStart()) + text.substring(sel.getEnd());
        this.index = sel.getStart();
        this.clearSelection();
        this.control.model.broadcast();
    }
    this.pasteSelection = function() {
        var model = this.control.model;
        model.text = model.text.substring(0,this.index) + this.clipboard + model.text.substring(this.index);
        this.index = this.index + this.clipboard.length;
        this.control.model.broadcast();
    }
    this.copySelection = function() {
        var model = this.control.model;
        var sel = this.control.selection;
        var text =  this.control.model.text;
        this.clipboard = text.substring(sel.getStart(), sel.getEnd());
    }
    
    this.advanceLine = function(offset) {
        var lineNum = this.view.indexToLineNum(this.index);
        var oldline = this.view.getLine(lineNum);
        
        //how many chars into the oldline are we
        var inset = this.index - oldline.start;

        //move to the new line
        lineNum += offset;
        var newline = this.view.getLine(lineNum);
        
        //if we are off the end of the document now
        if(!newline) {
            //if going down, move to end of line
            if(offset >= 0) {
                this.index = oldline.end-1;
            } else {
                //else move to start of line
                this.index = oldline.start;
            }
            return;
        }
        
        //calc new index
        this.index = newline.start+inset;
        //if too long for the new line, go to end of new line
        if(this.index > newline.end-1) {
            this.index = newline.end-1;
        }
        
        //done!
        
        //p("new     index and line = " + this.index + " " + lineNum);
    }
}

function TextSelection() {
    this.start = -1;
    this.end = -1;
    this.getStart = function() {
        if(this.end < this.start) return this.end;
        return this.start;
    }
    this.getEnd = function() {
        if(this.end < this.start) return this.start;
        return this.end;
    }
}

function JSTextControl() {
    this.selection = null;
    this.cursor = new Cursor();
    this.cursor.control = this;
    this.model = new TextModel();
    this.view = new TextView();
    this.view.control = this;
    this.styles = new StyleModel();
    this.view.styles = this.styles;
    this.view.setModel(this.model);
    this.styles.model = this.model;
    this.cursor.view = this.view;
    this.cursor.model = this.model;
    
    this.wrapping = true;
    this.setWrapping = function(wrapping) {
        this.wrapping = wrapping;
        this.view.wrapping = wrapping;
        return this;
    }
    
    this.setFont = function(font) {
        this.font = font;
        this.view.font = font;
        return this;
    }
    this.drawSelection = function(gfx) {
        if(this.selection != null) {
            var sel = this.selection;
            var view = this.view;
            var model = this.model;
            for(var i=0; i<this.view.lines.length; i++) {
                var line = this.view.lines[i];
                //before selection
                if(line.end < sel.start) continue;
                
                var x = 0;
                //selection start on this line
                if(line.start <= sel.start && line.end > sel.start) {
                    var before = model.text.substring(line.start,sel.start);
                    x = view.getStringWidth(before);
                }
                var x2 = line.w;
                //selection starts and ends on this line
                if(line.start <= sel.start && sel.end < line.end) {
                    var during = model.text.substring(sel.start,sel.end);
                    var w = view.getStringWidth(during);
                    x2 = x + w;
                }
                
                //selection ends on this line
                if(sel.end < line.end) {
                    var during = model.text.substring(line.start, sel.end);
                    var w = view.getStringWidth(during);
                    x2 = w;
                }
                
                //selection ends before this line
                if(sel.end < line.start) continue;
                
                gfx.fillQuadColor(new Color(0.5,1.0,0.5), 
                    { x: line.x+x, y: line.y, w: x2-x, h:line.h });
            }
        }
    }
    this.draw = function(gfx) {
        gfx.save();

        var bds = this.getBounds();
        bds.w += 10;
        bds.h += 10;
        gfx.fillQuadColor(new Color(0.5,0.5,0.5), bds);
        bds.w -= 2;
        bds.h -= 2;
        gfx.translate(1,1);
        
        var bgcolor = "#dddddd";
        if(this.stage.getKeyboardFocus() == this) {
            bgcolor = "#ffffff";
        }
        gfx.fillQuadColor(bgcolor, bds);
        
        gfx.translate(5,5);
        var font = this.font;
        
        this.drawSelection(gfx);
        
        var ch  = this.view.getElementAt(this.cursor.index);
        //var chw = this.view.getCharWidth(ch);
        var pos = this.view.indexToXY(this.cursor.index);
        
        var chx = 0;
        if(this.cursor.bias == this.cursor.FORWARD)  { chx = ch.width; }
        if(this.cursor.bias == this.cursor.BACKWARD) { }
        var chh = this.font.json.height* this.font.scale;

        //draw block cursor
        gfx.fillQuadColor(new Color(0.7,0.9,0.9), {
                x:pos.x,
                y:pos.y,
                w: ch.width,
                h: chh,
        });
        
        //draw the actual text
        this.view.lines.forEach(function(line) {
            line.runs.forEach(function(run) {
                gfx.fillQuadText(run.color, 
                    run.model.text.substring(run.start,run.end), 
                    run.x, line.y,
                    font.scaledsize, font.fontid
                    );
            });
        });
        
        
        //draw line cursor
        gfx.fillQuadColor(new Color(1,0,1), {
                x: pos.x+chx,
                y: pos.y,
                w: 2,
                h: chh,
        });
        gfx.restore();
    }
    
    var self = this;
    this.install = function(stage) {
        this.stage = stage;
        stage.on("KEYPRESS",this,function(kp) {
            console.log(kp.keycode);
            if(self.handlers[kp.keycode]) {
                self.handlers[kp.keycode](kp);
                return;
            }
            if(kp.printable) {
                //console.log(kp);
                if(kp.printableChar == 'x' && kp.system) {
                    self.cursor.cutSelection();
                    return;
                }
                if(kp.printableChar == 'c' && kp.system) {
                    self.cursor.copySelection();
                    return;
                }
                if(kp.printableChar == 'v' && kp.system) {
                    self.cursor.pasteSelection();
                    return;
                }
                    
                self.cursor.insertChar(kp.printableChar);
                self.cursor.advanceChar(+1);
                return;
            }
        });
    };
    
    this.handlers = {
        285: function(kp) { // left arrow
            if(kp.shift) {
                self.cursor.extendSelection(-1);
            } else {
                if(self.cursor.selectionActive()) {
                    self.cursor.clearSelection();
                } else {
                    self.cursor.advanceChar(-1);
                }
            }
        },
        286: function(kp) { // right arrow
            if(kp.shift) {
                self.cursor.extendSelection(+1);
            } else {
                if(self.cursor.selectionActive()) {
                    self.cursor.clearSelection();
                } else {
                    self.cursor.advanceChar(+1);
                }
            }
        },
        284: function(kp) { // down arrow
            if(kp.shift) {
            } else {
                if(self.cursor.selectionActive()) {
                    self.cursor.clearSelection();
                } else {
                    self.cursor.advanceLine(+1);
                }
            }
        },
        283: function(kp) { // up arrow
            if(kp.shift) {
            } else {
                if(self.cursor.selectionActive()) {
                    self.cursor.clearSelection();
                } else {
                    self.cursor.advanceLine(-1);
                }
            }
        },
        295: function(kp) { //delete/backspace key
            if(self.cursor.index - 1 < 0) return;
            if(self.cursor.selectionActive()) {
                self.cursor.deleteSelection();
                self.cursor.clearSelection();
            } else {
                self.cursor.deleteChar();
            }
        },
        294: function(kb) { // enter/return key
            if(!kb.target.wrapping) {
                kb.target.stage.fireEvent({
                    type:"ACTION",
                    target:kb.target
                });
                return;
            }
            self.cursor.insertNewline();
        },
    }
    
    this.setNewlineText = function(text) {
        this.model.setText(text);
    }
    this.setText = function(text) {
        this.model.setText(text);
    }
    this.getText = function() {
        return this.model.getText();
    }
    
    this.getVisible = function() { return true; }
    this.tx = 0;
    this.ty = 0;
    this.x = 0;
    this.y = 0;
    this.w = 100;
    this.getTx = function() { return this.tx; }
    this.getTy = function() { return this.ty; }
    this.setTx = function(tx) { this.tx = tx; return this; }
    this.setTy = function(ty) { this.ty = ty; return this; }
    this.setW = function(w) { this.w = w; return this; }
    this.setH = function(h) { this.h = h; return this; }
    this.getW = function() { return this.w; }
    this.getH = function() { return this.h; }
    this.setParent = function(p) { this.parent = p; return this; }
    this.contains = function(pt){
        if(pt.x<this.x){
            return false;}
        ;
            if(pt.x>this.x+this.w){
            return false;}
        ;
            if(pt.y<this.y){
            return false;}
        ;
            if(pt.y>this.y+this.h){
            return false;}
        ;
        return true;
    }
    this.getBounds = function() {
        return {
            x:0,
            y:0,
            w:this.w,
            h:this.h
        };
    }
}

function JSTextArea() {
    JSTextControl();
    this.wrapping = true;
    this.view.wrapping = this.wrapping;
    this.view.layout();
}
JSTextArea.extend(JSTextControl);
core.createTextArea = function() {
    var comp = new JSTextArea();
    comp.font = this.DEFAULT_FONT;
    comp.view.font = this.DEFAULT_FONT;
    comp.view.control = comp;
    comp.install(this.stage);
    return comp;
}

function JSTextField() {
    JSTextControl();
    this.wrapping = false;
    this.view.wrapping = this.wrapping;
    this.view.layout();
    this.getBounds = function() {
        return {
            x:0,
            y:0,
            w:this.getW(),
            h:this.getH()
        };
    }
}
JSTextField.extend(JSTextControl);

core.createTextField = function() {
    var comp = new JSTextField();
    comp.setFont(this.DEFAULT_FONT);
    comp.install(this.stage);
    return comp;
}


/*
function JSSlider() {
    var self = this;
    this.w = 200;
    this.h = 100;
    this.valueToPoint = function(v) {
        return (this.value-this.minvalue) *
            (this.w / (this.maxvalue-this.minvalue));
    }
    this.pointToValue = function(p) {
        return p * (this.maxvalue-this.minvalue)/this.w + this.minvalue;
    }
    this.draw = function(gfx) {
        var bounds = self.getBounds();
        gfx.fillQuadColor(this.getBaseColor(),this.getBounds());
        var v = this.valueToPoint(this.value);
        var bds = { 
            x: bounds.x,
            y: bounds.y,
            w: v,
            h: bounds.h
        };
        gfx.fillQuadColor("#ff0000", bds);
        
    }
    
    var self = this;
    this.install = function(stage) {
        stage.on("DRAG", this, function(e) {
            var r = e.target;
            r.setValue(r.pointToValue(e.point.x-r.getTx()));
        });
    }
    
    this.setBaseColor("#888888");
    this.getBounds = function() {
        return {x:self.x, y:self.y, w:self.w, h:self.h };
    };
}
*/

widgets.CommonSlider.extend(generated.Slider);
core.createSlider = function() {
    var comp = new widgets.CommonSlider();
    comp.font = this.DEFAULT_FONT;
    comp.install(this.stage);
    return comp;
}


function JSImageView() {
    this.loaded = false;
    this.loading = false;
    this.stage = null;
    this.image = null;
    this.install = function(stage)  {
        this.stage = stage;
    }
    this.setUrl = function(url) {
        this.url = url;
        this.loaded = false;
        this.loading = false;
    }
    var self = this;
    this.loadImage = function() {
        if(this.loading) return;
        if(!this.url) return;
        console.log("starting to load the image " + this.url);
        this.loading = true;
        if(this.url.toLowerCase().endsWith(".png")) {
            this.image = amino.loadPngFromBuffer(this.url);
        } else {
            this.image = amino.loadJpegFromBuffer(this.url);
        }
        console.log("image = ", this.image);
        this.loaded = true;
    }
    this.draw = function(gfx) {
        if(this.loaded && this.image) {
            if(this.sw && this.sh) {
                gfx.fillQuadTexture(this.image.texid, 0,0, this.sw, this.sh);
            } else {
                gfx.fillQuadTexture(this.image.texid, 0,0, this.image.w, this.image.h);
            }
        } else {
            this.loadImage();
        }
    }
}
JSImageView.extend(generated.ImageView);
core.createImageView = function() {
    var comp = new JSImageView();
    comp.install(this.stage);
    return comp;
}



var SceneParser = function() {
    this.parseChildren = function(core, val, obj) {
        for(var i=0; i<obj.children.length; i++) {
            var ch = obj.children[i];
            var chv = this.parse(core, ch);
            val.add(chv);
        }
    }
    
    this.fillProps = function(out, obj) {
        for(var prop in obj) {
            if(prop == "type") continue;
            if(prop == "children") continue;
            if(prop == "fill") {
                out["set"+camelize(prop)](obj[prop]);
                continue;
            }
            out[prop] = obj[prop];
        }
    }
    
    this.findNode = function(id, node) {
        if(node.id && node.id == id) return node;
        if(node.isparent && node.isparent()) {
            for(var i=0; i<node.getChildCount(); i++) {
                var ret = this.findNode(id,node.getChild(i));
                if(ret != null) return ret;
            }
        }
        return null;
    }
    
    this.parseBindings = function(val, obj) {
        console.log("parsing bindings " + obj.bindings.length);
        val.bindings = [];
        /*
        for(var i=0; i<obj.bindings.length; i++) {
            var bin = obj.bindings[i];
            var trans = new Transition();
            trans.id = bin.id;
            trans.pushTrigger = this.findNode(bin.pushTrigger,val);
            trans.pushTarget = this.findNode(bin.pushTarget,val);
            val.bindings.push(trans);
        }
        */
    }

    this.typeMap = {
        "Group":"createGroup",
        "Rect": "createRect",
        "PushButton": "createPushButton",
        "ToggleButton":"createToggleButton",
        "Label":"createLabel",
        "Slider":"createSlider",
        "ListView":"createListView",
        "Document":"createGroup",
        "DynamicGroup":"createGroup",
        "AnchorPanel":"createAnchorPanel",
        "ImageView":"createImageView",
        "TextField":"createTextField",
        "TextArea":"createTextArea",
    };
    this.parentTypeMap = {
        "Group":JSGroup,
        "Document":JSGroup,
        "DynamicGroup":JSGroup,
        "AnchorPanel":JSAnchorPanel,
    };
    
    this.parse = function(core, obj) {
        if(this.typeMap[obj.type]) {
            var out = core[this.typeMap[obj.type]]();
            //var out = new this.typeMap[obj.type]();
            out.type = obj.type;
            if(this.parentTypeMap[obj.type]) {
                this.fillProps(out,obj);
                this.parseChildren(core, out,obj);
            } else {
                this.fillProps(out,obj);
            }
            
            if(obj.type == "Document" && obj.bindings) {
                this.parseBindings(out,obj);
            }
            
            return out;
        }
        console.log("warning. no object for type " + obj.type);
    }
}




core.windowCreated = false;

var log = function(s) {
    console.log(s);
}

function SpeedTimer(title) {
    this.count = 0;
    this.title = title;
    this.startTime = new Date().getTime();
    this.pulse = function() {
        this.count++;
        if(this.count >= 10) {
            var time = new Date().getTime();
            var dt = time-this.startTime;
            console.log(title + " " + (dt/10) + "msec / frame");
            this.count = 0;
            this.startTime = time;
        }
    }
    this.cstart = 0;
    this.accum = 0;
    this.start = function() {
        this.cstart = new Date().getTime();
    }
    this.end = function() {
        this.accum += (new Date().getTime() - this.cstart);
        this.check();
    }
    this.check = function() {
        this.count++;
        if(this.count >= 10) {
            console.log(title +"  : " + this.accum/10 + " ms/frame");
            this.count = 0;
            this.accum = 0;
        }
    }
}

core.started = false;
core.start = function() {
    if(!this.windowCreated) {
        core.real_OpenWindow(this.stage.width, this.stage.height);
    }
    var drawcb = this.stage.draw;
    var eventcb = this.stage.processEvents;
    core.real_Init();
    
    for(var i in core.fonts) {
        var font = core.fonts[i];
        font.loadImage();
    }
    
    //send one windowsize event on phones
    if(core.device == "galaxynexus") {
        core.stage.fireEvent({type:"WINDOWSIZE",width:core.stage.width, height:core.stage.height, target: core.stage});
    }
    core.started = true;
    //var tim = new SpeedTimer("fps");
    setInterval(function() {
        //tim.pulse();
        core.real_Repaint(drawcb,eventcb);
    },0)
}

core.setDevice = function(device) {
    this.device = device;
    if(device == "galaxynexus") {
        core.SCREEN_ROTATE = false;
        core.SCALE2X = true;
        core.DEFAULT_WIDTH=360;
        core.DEFAULT_HEIGHT=640;
    }
    if(device == "mac") {
        core.SCREEN_ROTATE = false;
        core.SCALE2X = false;
        core.DEFAULT_WIDTH=640;
        core.DEFAULT_HEIGHT=480;
    }
}


function elasticIn(t) {
    var p = 0.3;
    return -(Math.pow(2,10*(t-1)) * Math.sin(((t-1)-p/4)*(2*Math.PI)/p));
}
function elasticOut(t) {
    var p = 0.3;
    return Math.pow(2,-10*t) * Math.sin((t-p/4)*(2*Math.PI)/p) + 1;
}
function cubicIn(t) {
    return Math.pow(t,3);
}
function cubicOut(t) {
    return 1-cubicIn(1-t);
}
function smoothstepIn(t) {
    return t*t*(3-2*t);
}
function cubicInOut(t) {
    if(t < 0.5) return cubicIn(t*2.0)/2.0;
    return 1-cubicIn((1-t)*2)/2;                
}
function camelize(s) {
    return s.substring(0,1).toUpperCase() + s.substring(1);
}
function anim(node, prop, start, finish, dur) {
    if(!node) {
        console.log("ERROR! Can't animate. Node to animate is null!");
    }
    return {
        node:node,
        prop:prop,
        sval:start,
        fval:finish,
        dur:dur,
        running:false,
        finished:false,
        easefn:null,
        setVal:function(t) {
            if(this.easefn != null) {
                t = this.easefn(t);
            }
            var v = (this.fval-this.sval)*t + this.sval;
            node["set"+camelize(this.prop)](v);
        },
        update:function() {
            if(this.finished) return;
            if(!this.running) {
                this.startTime = new Date().getTime();
                this.running = true;
                if(this.beforecb) this.beforecb();
                return;
            }
            var time = new Date().getTime();
            var dt = time-this.startTime;
            var t = dt/this.dur;
            if(t > 1) {
                this.finished = true;
                if(this.aftercb) this.aftercb();
                this.setVal(1);
                return;
            }
            this.setVal(t);
        },
        setEase:function(easefn) {
            this.easefn = easefn;
            return this;
        },
        after: function(aftercb) {
            this.aftercb = aftercb;
            return this;
        },
        before: function(beforecb) {
            this.beforecb = beforecb;
            return this;
        },
    };
}



exports.getCore =function() { return core; }
exports.ParseRGBString = ParseRGBString;
exports.Color = Color;
exports.SceneParser = SceneParser;
exports.anim = anim;
exports.cubicInOut = cubicInOut;
