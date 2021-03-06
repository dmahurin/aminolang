var amino = require('../../build/desktop/amino.js');
var widgets = require('../../build/desktop/widgets.js');
var fs = require('fs');
var lame = require('lame');
var Speaker = require('speaker');

exports.SongListViewCell = amino.ComposeObject({
    type:"SongListViewCell",
    extend: amino.ProtoWidget,
    comps: {
        background: {
            proto: amino.ProtoRect,
            promote: ['w','h','fill'],
        },
        title: {
            proto: amino.ProtoText,
        },
        artist: {
            proto: amino.ProtoText,
        },
        album: {
            proto: amino.ProtoText,
        },
        play: {
            proto: widgets.PushButton,
        },
    },
    init: function() {
        this.comps.base.add(this.comps.background);
        this.comps.base.add(this.comps.title);
        this.comps.base.add(this.comps.artist);
        this.comps.base.add(this.comps.album);
        this.comps.base.add(this.comps.play);
        this.comps.title.setTx(0).setTy(20).setFontSize(15);
        this.comps.artist.setTx(200).setTy(20).setFontSize(15);
        this.comps.album.setTx(300).setTy(20).setFontSize(15);
        this.comps.play.setTx(450).setTy(5).setW(40).setH(20).setText("play");
    },
});


exports.MusicViewCustomizer = function(view,folder) {
    var lv = new widgets.ListView().setFill("#ffffff");
    view.comps.contents.add(lv);
    lv.setModel(folder.getItems());
    lv.setCellGenerator(function() { return new exports.SongListViewCell(); });
    lv.setTextCellRenderer(function(cell,index,item) {
        if(item == null) return;
        cell.comps.title.setText(item.doc.title);
        cell.comps.artist.setText(item.doc.artist);
        cell.comps.album.setText(item.doc.album);
    });
    if(folder.onUpdate) {
        folder.onUpdate(function(doc) {
            lv.setModel(folder.getItems());
        });
    }
    
    var trackLabel = new widgets.Label().setText("track")
        .setH(20).setW(100).setFontSize(15);

    var speaker;

    var PLAY_ICON ='\uf04b';
    var PAUSE_ICON='\uf04c';
    var playButton = new widgets.PushButton();
    var playing = false;
    function stopPlaying() {
        playButton.setText(PLAY_ICON);
        speaker.end();
        speaker = null;
        playing = false;
    }
    function playFile(file) {
        console.log("playing: " + file);
        if(playing) {
            stopPlaying();
        }
        playing = true;
        speaker = new Speaker;
        trackLabel.setText(file);
        playButton.setText(PAUSE_ICON);
        fs.createReadStream(file)
            .pipe(new lame.Decoder)
            .on('format',console.log)
            .on('readable',console.log)
            .on('end',console.log)
            .on('error',console.log)
            .on('close',console.log)
            .pipe(speaker);
    }
    
    var current = -1;
    function playCurrentTrack() {
        console.log("current = " + current);
        if(current < 0) current = 0;
        var items = folder.getItems();
        if(current >= items.length) return;
        var song = items[current];
        console.log("trying to play",song);
        if(song.doc.file && fs.existsSync(song.doc.file)) {
            playFile(song.doc.file);
        } else {
            current++;
            playCurrentTrack();
        }
    }
    
    function playNextTrack() {
        current++;
        playCurrentTrack();
    }
    
    function playPrevTrack() {
        current--;
        playCurrentTrack();
    }
    
    view.comps.toolbar
        .add(
            new widgets.PushButton().setW(30).setH(20).setFontSize(20).setFontName('awesome')
            .setText('\uf04a').onAction(function(e) {
                playPrevTrack();
            }))
        .add(
            playButton.setW(30).setH(20).setFontSize(20).setFontName('awesome')
            .setText(PLAY_ICON).onAction(function(e) {
                playCurrentTrack();
            }))
        .add(
            new widgets.PushButton().setW(30).setH(20).setFontSize(20).setFontName('awesome')
            .setText('\uf04e').onAction(function(e) {
                playNextTrack();
            }))
        .add(trackLabel);
        ;
    view.comps.toolbar.redoLayout();
}

