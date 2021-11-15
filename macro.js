var context = {};
exports.set_context = function(_context){
    context = _context;
};
exports.commands = {
    reset: {
        check: function(text) {
            return (text.startsWith('rst'));
        },
        control: function(text) {
            return '[{"cmd":"m","x":"-100","y":"-100","t":"6","d":"10"}]';
        },
        serialize: function() {
            return 'rst';
        }
    },
    wait: {
        check: function(text) {
            return (text.startsWith('wts'));
        },
        control: function(text) {
            return '';
        },
        serialize: function(second) {
            return 'wts'+second;
        },
        parse: function(text) {
            return {second: text.match(/wts([0-9]+)/)[1]};
        }
    },
    move: {
        check: function(text) {
            return (text.startsWith('mmv'));
        },
        control: function(text) {
            var params = text.match(/mmv([0-9-]+),([0-9-]+)/);
            const movement = context.movement;
            var minx = "";
            var miny = "";
            if (params[1] < 0) minx = "-";
            if (params[2] < 0) miny = "-";
            var pl = [
                {
                    cmd: "m",
                    x: minx+movement,
                    y: "0",
                    t: ""+Math.abs(params[1]),
                    d: "10"
                },
                {
                    cmd: "m",
                    x: "0",
                    y: miny+movement,
                    t: ""+Math.abs(params[2]),
                    d: "10"
                },
            ]
            return JSON.stringify(pl);
        },
        serialize: function(x,y) {
            return 'mmv'+x+","+y;
        }
    },
    move_click_left: {
        check: function(text) {
            return (text.startsWith('mcl'));
        },
        control: function(text) {
            var params = text.match(/mcl([0-9-]+),([0-9-]+)/);
            const movement = context.movement;
            var minx = "";
            var miny = "";
            if (params[1] < 0) minx = "-";
            if (params[2] < 0) miny = "-";
            var pl = [
                {
                    cmd: "m",
                    x: minx+movement,
                    y: "0",
                    t: ""+Math.abs(params[1]),
                    d: "20"
                },
                {
                    cmd: "m",
                    x: "0",
                    y: miny+movement,
                    t: ""+Math.abs(params[2]),
                    d: "20"
                },
                {
                    cmd: "c",
                    d: "50"
                }
            ]
            return JSON.stringify(pl);
        },
        serialize: function(x,y) {
            return 'mcl'+x+","+y;
        }
    },
    move_press_left: {
        check: function(text) {
            return (text.startsWith('mpl'));
        },
        control: function(text) {
            var params = text.match(/mpl([0-9-]+),([0-9-]+)/);
            const movement = context.movement;
            var minx = "";
            var miny = "";
            if (params[1] < 0) minx = "-";
            if (params[2] < 0) miny = "-";
            var pl = [
                {
                    cmd: "m",
                    x: minx+movement,
                    y: "0",
                    t: ""+Math.abs(params[1]),
                    d: "10"
                },
                {
                    cmd: "m",
                    x: "0",
                    y: miny+movement,
                    t: ""+Math.abs(params[2]),
                    d: "10"
                },
                {
                    cmd: "p",
                    d: "10"
                }
            ]
            return JSON.stringify(pl);
        },
        serialize: function(x,y) {
            return 'mpl'+x+","+y;
        }
    },
    move_release_left: {
        check: function(text) {
            return (text.startsWith('mrl'));
        },
        control: function(text) {
            var params = text.match(/mrl([0-9-]+),([0-9-]+)/);
            const movement = context.movement;
            var minx = "";
            var miny = "";
            if (params[1] < 0) minx = "-";
            if (params[2] < 0) miny = "-";
            var pl = [
                {
                    cmd: "m",
                    x: minx+movement,
                    y: "0",
                    t: ""+Math.abs(params[1]),
                    d: "10"
                },
                {
                    cmd: "m",
                    x: "0",
                    y: miny+movement,
                    t: ""+Math.abs(params[2]),
                    d: "10"
                },
                {
                    cmd: "r",
                    d: "10"
                }
            ]
            return JSON.stringify(pl);
        },
        serialize: function(x,y) {
            return 'mrl'+x+","+y;
        }
    },
    single_click_left: {
        check: function(text) {
            return (text.startsWith('scl'));
        },
        control: function(text) {
            return '[{"cmd":"c"}]';
        },
        serialize: function() {
            return 'scl';
        }
    },
    single_press_left: {
        check: function(text) {
            return (text.startsWith('spl'));
        },
        control: function(text) {
            return '[{"cmd":"p"}]';
        },
        serialize: function() {
            return 'spl';
        }
    },
    single_release_left: {
        check: function(text) {
            return (text.startsWith('srl'));
        },
        control: function(text) {
            return '[{"cmd":"r"}]';
        },
        serialize: function() {
            return 'srl';
        }
    },
    single_click_right: {
        check: function(text) {
            return (text.startsWith('scr'));
        },
        control: function(text) {
            return '[{"cmd":"rc"}]';
        },
        serialize: function() {
            return 'scr';
        }
    },
    single_press_right: {
        check: function(text) {
            return (text.startsWith('spr'));
        },
        control: function(text) {
            return '[{"cmd":"rp"}]';
        },
        serialize: function() {
            return 'spr';
        }
    },
    single_release_right: {
        check: function(text) {
            return (text.startsWith('srr'));
        },
        control: function(text) {
            return '[{"cmd":"rr"}]';
        },
        serialize: function() {
            return 'srr';
        }
    },
    single_click_middle: {
        check: function(text) {
            return (text.startsWith('scm'));
        },
        control: function(text) {
            return '[{"cmd":"mc"}]';
        },
        serialize: function() {
            return 'scm';
        }
    },
    single_press_middle: {
        check: function(text) {
            return (text.startsWith('spm'));
        },
        control: function(text) {
            return '[{"cmd":"mp"}]';
        },
        serialize: function() {
            return 'spm';
        }
    },
    single_release_middle: {
        check: function(text) {
            return (text.startsWith('srm'));
        },
        control: function(text) {
            return '[{"cmd":"mr"}]';
        },
        serialize: function() {
            return 'srm';
        }
    },

};
