var fs = require('fs');
//var amino = require('/data/node/amino.js');
var amino = require('../src/node/amino.js');
var core = amino.getCore();
//set up the screen properly
core.setDevice("mac");

var stage = core.createStage();

//load up the scene file
var filedata = fs.readFileSync('tests/phone.json');
var jsonfile = JSON.parse(filedata);
var root = new amino.SceneParser().parse(core,jsonfile);
stage.setRoot(root);

//set our util functions and data
var a = amino.anim;
var screen = {
    w:720/2,
    h:1280/2
}

function wrapTransform(target) {
    var trans = core.createTransform();
    target.setTx(0).setTy(0);
    var p = target.getParent();
    p.remove(target);
    trans.setChild(target);
    p.add(trans);
    return trans;
}
function animOut(trns, soff, eoff) {
    stage.addAnim(amino.anim(trns,"scalex",1.0,0.5,200));
    stage.addAnim(amino.anim(trns,"scaley",1.0,0.5,200));
    stage.addAnim(amino.anim(trns,"tx",soff,screen.w/4+eoff,200));
    stage.addAnim(amino.anim(trns,"ty",0+50,screen.h/4,200));
}

function animIn(trns, soff, eoff) {
    stage.addAnim(a(trns,"scalex",0.5,1.0,200));
    stage.addAnim(a(trns,"scaley",0.5,1.0,200));
    stage.addAnim(a(trns,"tx",screen.w/4+soff,0+eoff,200));
    stage.addAnim(a(trns,"ty",screen.h/4,50,200));
}


//set up the apps
var apps = [];
var curr = 0;

//init the apps
apps.push(wrapTransform(stage.find("app1")));
apps.push(wrapTransform(stage.find("app2")));
apps.push(wrapTransform(stage.find("app3")));
apps.push(wrapTransform(stage.find("app4")));
apps.push(wrapTransform(stage.find("app5")));
apps.push(wrapTransform(stage.find("app6")));


//init the apps
for(var i=0; i<apps.length; i++) {
    apps[i].setTx(i*screen.w);
    apps[i].setTy(50);
    console.log(apps[i].getChild().type);
    apps[i].getChild().setW(screen.w);
    apps[i].getChild().setH(screen.h-50);
}



//init the dock
var dock = stage.find("dock");
dock.setTx(screen.h).setW(screen.w);
stage.on("PRESS",stage.find("upButton"),function(e) {
    for(var i=0; i<apps.length; i++) {
        animOut(apps[i],(i-curr)*screen.w,(i-curr)*screen.w * 2/3);
    }
    
    dock.setTx(0);
    stage.addAnim(a(dock,"ty",screen.h,screen.h-60,200));
    console.log(dock.getTy());
    
    //insert a transparent shim
    var shim = core.createRect();
    shim.setTy(40).setW(screen.w).setH(screen.h).setFill("green").setOpacity(0.2);
    //disable drawing
    shim.draw = function(){}
    root.add(shim);
    //click on the shim to animate everything back
    stage.on("PRESS", shim, function(e) {
        shim.getParent().remove(shim);
        for(var i=0; i<apps.length; i++) {
            animIn(apps[i],(i-curr)*screen.w * 2/3,(i-curr)*screen.w);
        }
        stage.addAnim(a(dock,"ty",screen.h-60,screen.h,200));
    });
    
});


stage.find("composePanel").setVisible(false);
stage.find("contactsPanel").setVisible(false);



stage.on("PRESS",stage.find("addItemButton"),function(e) {
    process.exit(0);
});

var todoList = stage.find("todoList");
todoList.listModel = [];
for(var i=0; i<40; i++) {
    todoList.listModel.push(i+" foo");
}
todoList.setW(screen.w).setH(screen.h-200).setTx(0);
stage.find("addItemButton").setTy(10).setY(0);


stage.on("PRESS",stage.find("rightButton"),function(e) {
    if(curr == apps.length-1) return;
    for(var i=0; i<apps.length; i++) {
        stage.addAnim(a(apps[i],"tx", (i-curr)*200+320/4, (i-curr-1)*200+320/4, 300).setEase(amino.cubicInOut));
    }
    curr++;
    if(curr > apps.length-1) curr = apps.length-1;
});
stage.on("PRESS",stage.find("leftButton"),function(e) {
    if(curr == 0) return;
    for(var i=0; i<apps.length; i++) {
        stage.addAnim(a(apps[i],"tx", (i-curr)*200+320/4, (i-curr+1)*200+320/4, 300).setEase(amino.cubicInOut));
    }
    curr--;
    if(curr < 0) curr = 0;
});




//move the topslider to the top of it's siblings
var settings = stage.find("quicksettings");
var par = settings.getParent();
settings.getParent().remove(settings);
par.add(settings);
settings.setW(screen.w).setTx(0).setTy(-300);

stage.on("PRESS",stage.find("downButton"), function(e) {
    settings.setTx(0).setTy(0);
    stage.addAnim(a(settings,"ty",-200,0,300).setEase(amino.cubicInOut));
});
stage.on("PRESS",stage.find("quicksettings"),function(e){
    stage.addAnim(a(settings,"ty",0,-200,300));
});


//delay 1 sec to ensure the png image is loaded first
setTimeout(function() {
    core.start();
},1000);

