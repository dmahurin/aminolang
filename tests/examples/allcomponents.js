if(typeof document == "undefined") {
    var amino = require('amino.js');
    var widgets= require('widgets.js'); 
}

amino.startApp(function(core, stage) {
    var tests = [];
    var selected = 0;
    var root = new amino.ProtoGroup();
    var testarea = new amino.ProtoGroup().setTx(30).setTy(100);
    root.add(testarea);
    var label = new widgets.Label().setText("test X")
        .setW(60).setH(30).setTx(0).setTy(0);
    root.add(label);
    root.add(new widgets.PushButton()
        .setText("prev")
        .setW(80).setH(30)
        .setTx(20).setTy(30)
        .onAction(function() {
            selected = (selected-1+tests.length)%tests.length;
            switchTest(selected);
        }));
    root.add(new widgets.PushButton().setText("next")
        .setW(80).setH(30)
        .setTx(200).setTy(30)
        .onAction(function() {
            selected = (selected+1)%tests.length;
            switchTest(selected);
        }));
    stage.setRoot(root);
    
    function switchTest(n) {
        var test = tests[n];
        testarea.clear();
        testarea.add(test.content);
        label.setText(test.title);
    }
    
    var shapes = {
        title: "basic shapes",
        content: new amino.ProtoGroup()
        .add(new amino.ProtoText().setText("rects w/ & w/o opacity").setTx(0).setTy(-10))
        .add(new amino.ProtoRect().setW(50).setH(50).setFill("#00ff00").setTx(5).setTy(20))
        .add(new amino.ProtoRect().setW(50).setH(50).setFill("#00ff00").setOpacity(0.2).setTx(100).setTy(20))
        
        .add(new amino.ProtoText().setText("text").setFill("#0000ff").setTx(230))
        
        
        .add(new amino.ProtoText().setText("polys w/ & w/o opacity").setTx(0).setTy(100))
        .add(new amino.ProtoPoly()
                .setGeometry([0,0, 50,0,  50,50, 25,45]).setDimension(2)
                .setClosed(true).setFilled(true).setTy(120))
        .add(new amino.ProtoPoly().setGeometry([0,0, 50,0,  50,50, 25,45]).setClosed(true).setFilled(false).setTx(100).setTy(120))
        .add(new amino.ProtoPoly().setGeometry([0,0, 50,0,  50,50, 25,45]).setClosed(false).setFilled(true).setTy(200))
        .add(new amino.ProtoPoly().setGeometry([0,0, 50,0,  50,50, 25,45]).setClosed(false).setFilled(false).setTy(200).setTx(100))
        .add(new amino.ProtoText().setText("image scaled 0.5x").setTx(300).setTy(0))
        .add(new amino.ProtoImageView().setSrc("../images/keane_01.jpg").setTx(300).setTy(20).setScalex(0.5).setScaley(0.5))
    };
    tests.push(shapes);
    
    
    
    var simpleControls = {
        title: "simple controls",
        content: new widgets.VerticalPanel().setW(300).setH(200).setGap(5).setPadding(5),
    }
    simpleControls.content.add(new widgets.Label().setText("a label inside vertical panel").setH(30));
    simpleControls.content.add(new widgets.PushButton().setText("Push Button").setH(30));
    simpleControls.content.add(new widgets.ToggleButton().setText("Toggle Button").setH(30));
    simpleControls.content.add(new widgets.Label().setText("a slider is next").setH(30));
    simpleControls.content.add(new widgets.Slider());
    //simpleControls.content.add(new widgets.ProgressSpinner().setActive(true).setSize(30));
    tests.push(simpleControls);
    
    
    var lists = {
        title: "list example, plain and styled",
        content: new widgets.AnchorPanel().setW(400).setH(200),
    };
    lists.content.add(new widgets.ListView().setW(100).setH(150));
    lists.content.add(new widgets.ListView().setW(100).setH(150).setTx(120));
    tests.push(lists);
    
    var text = {
        title: "textfield example, field and area",
        content: new widgets.AnchorPanel().setW(400).setH(200),
    };
    text.content.add(new widgets.TextField().setW(200).setH(30).setText("single line text field"));
    text.content.add(new widgets.TextField().setW(200).setH(100).setWrapping(true).setTy(50)
        .setText("multiline text field. It does proper wrapping so that you can type on multiple lines")
        );
    tests.push(text);
    
    
    
    var anims = {
        title: "simple animations",
        content: new amino.ProtoGroup()
        .add(new widgets.PushButton().setText("0 to 100, 1 sec. no easing").setW(300).setH(30).setTx(0).setTy(30).onAction(function(e) {
            amino.getCore().createPropAnim(e.source,'tx',0,100,1000);
        }))
        .add(new widgets.PushButton().setText("0 to 100, 3 sec. no easing").setW(300).setH(30).setTx(0).setTy(70).onAction(function(e) {
            amino.getCore().createPropAnim(e.source,'tx',0,100,3000);
        }))
        .add(new widgets.PushButton().setText("0 to 200, 1 sec. ease in").setW(300).setH(30).setTx(0).setTy(110).onAction(function(e) {
            amino.getCore().createPropAnim(e.source,'tx',0,200,1000).setInterpolator(amino.Interpolators.CubicIn);
        }))
        .add(new widgets.PushButton().setText("rotate X 360, 1 sec.").setW(300).setH(30).setTx(0).setTy(150).onAction(function(e) {
            amino.getCore().createPropAnim(e.source,'rotateX',0,360,1000);
        }))
        .add(new widgets.PushButton().setText("0 to 100, 1 sec, loop 2").setW(300).setH(30).setTx(0).setTy(190).onAction(function(e) {
            amino.getCore().createPropAnim(e.source,'tx',0,100,1000).setCount(2);
        }))
        .add(new widgets.PushButton().setText("0 to 100, 1 sec, loop -1").setW(300).setH(30).setTx(0).setTy(230).onAction(function(e) {
            amino.getCore().createPropAnim(e.source,'tx',0,100,1000).setCount(-1);
        }))
        .add(new widgets.PushButton().setText("0 to 100, 1 sec, loop -1, autoreverse").setW(300).setH(30).setTx(0).setTy(270).onAction(function(e) {
            amino.getCore().createPropAnim(e.source,'tx',0,100,1000).setCount(-1).setAutoreverse(true);
        }))
    };
    tests.push(anims);
    
    
    var texts = [
        new amino.ProtoText().setText('small size').setFontSize(10),
        new amino.ProtoText().setText('default size'),
        new amino.ProtoText().setText('large size').setFontSize(20),
        new widgets.Label().setText('left label').setAlign("left").setW(200),
        new widgets.Label().setText('center label').setAlign("center").setW(200),
        new widgets.Label().setText('right label').setAlign("right").setW(200),
        new amino.ProtoText().setText('blue text').setFill("#0000ff"),
        new amino.ProtoText().setText('translucent text')//.setOpacity(0.3),
    ];
        
    
    var textlayout = {
        title: "text layout",
        content: new amino.ProtoGroup()
    }
    textlayout.content.add(new amino.ProtoRect().setTx(100).setTy(0).setW(200).setH(300));
    for(var i=0; i<texts.length; i++) {
        textlayout.content.add(texts[i].setTx(100).setTy(i*40));
    }
    
    textlayout.content.add(new amino.ProtoRect().setTx(350).setTy(0).setW(200).setH(200));
    textlayout.content.add(new widgets.Label().setText('top aligned')   .setTx(350).setTy(0).setFontSize(40).setH(200).setValign("top"));
    textlayout.content.add(new widgets.Label().setText('center aligned').setTx(350).setTy(0).setFontSize(40).setH(200).setValign("center"));
    textlayout.content.add(new widgets.Label().setText('bottom aligned').setTx(350).setTy(0).setFontSize(40).setH(200).setValign("bottom"));
    
    tests.push(textlayout);
    
    switchTest(0);
        
});
