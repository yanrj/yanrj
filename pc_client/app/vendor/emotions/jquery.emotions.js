/**
 * jQuery's jqfaceedit Plugin
 *
 * @author cdm
 * @version 0.2
 * @copyright Copyright(c) 2012.
 * @date 2012-08-09
 */
(function($) {

    var emRegex = "/::\\)|/::~|/::B|/::\\||/:8-\\)|/::lt|/::\\$|/::X|/::Z|/::\\.\\(|/::-\\||/::@|/::P|/::D|/::O|/::\\(|/::\\+|/:--b|/::Q|/::T|/:,@P|/:,@-D|/::d|/:,@o|/::hg|/:\\|-\\)|/::!|/::L|/::gt|/::,@|/:,@f|/::-S|/:\\?|/:,@x|/:,@@|/::8|/:,@!|/:!!!|/:xx|/:bye|/:wipe|/:dig|/:handclap|/:and-\\(|/:B-\\)|/:lt@|/:@gt|/::-O|/:gt-\\||/:P-\\(|/::\\.\\||/:X-\\)|/::\\*|/:@x|/:8\\*|/:pd|/:ltWgt|/:beer|/:basketb|/:oo|/:coffee|/:eat|/:pig|/:rose|/:fade|/:showlove|/:heart|/:break|/:cake|/:li|/:bome|/:kn|/:footb|/:ladybug|/:shit|/:moon|/:sun|/:gift|/:hug|/:strong|/:weak|/:share|/:v|/:@\\)|/:jj|/:@@|/:bad|/:lvu|/:no|/:ok"
    //"|/:love|/:ltLgt|/:jump|/:shake|/:ltOgt|/:circle|/:kotow|/:turn|/:skip|/:oY|/:#-0|/:hiphot|/:kiss|/:ltand|/:andgt";

    var em = {
        "/::)": ["0", "微笑", "Smile"],
        "/::~": ["1", "撇嘴", "Grimace"],
        "/::B": ["2", "色", "Drool"],
        "/::|": ["3", "发呆", "Scowl"],
        "/:8-)": ["4", "得意", "Chill"],
        "/::lt": ["5", "流泪", "Sob"],
        "/::$": ["6", "害羞", "Shy"],
        "/::X": ["7", "闭嘴", "Silent"],
        "/::Z": ["8", "睡", "Sleep"],
        "/::.(": ["9", "大哭", "Cry"],
        "/::-|": ["10", "尴尬", "Awkward"],
        "/::@": ["11", "发怒", "Pout"],
        "/::P": ["12", "调皮", "Wink"],
        "/::D": ["13", "呲牙", "Grin"],
        "/::O": ["14", "惊讶", "Surprised"],
        "/::(": ["15", "难过", "Frown"],
        "/::+": ["16", "酷", "Cool"],
        "/:--b": ["17", "冷汗", "Tension"],
        "/::Q": ["18", "抓狂", "Crazy"],
        "/::T": ["19", "吐", "Puke"],
        "/:,@P": ["20", "偷笑", "Chuckle"],
        "/:,@-D": ["21", "可爱", "Joyful"],
        "/::d": ["22", "白眼", "Slight"],
        "/:,@o": ["23", "傲慢", "Smug"],
        "/::hg": ["24", "饥饿", "Hungry"],
        "/:|-)": ["25", "困", "Drowsy"],
        "/::!": ["26", "惊恐", "Panic"],
        "/::L": ["27", "流汗", "Sweat"],
        "/::gt": ["28", "憨笑", "Laugh"],
        "/::,@": ["29", "悠闲", "Commando"],
        "/:,@f": ["30", "奋斗", "Strive"],
        "/::-S": ["31", "咒骂", "Scold"],
        "/:?": ["32", "疑问", "Doubt"],
        "/:,@x": ["33", "嘘", "Shhh"],
        "/:,@@": ["34", "晕", "Dizzy"],
        "/::8": ["35", "疯了", "Tormented"],
        "/:,@!": ["36", "衰", "Toasted"],
        "/:!!!": ["37", "骷髅", "Skull"],
        "/:xx": ["38", "敲打", "Hammer"],
        "/:bye": ["39", "再见", "Wave"],
        "/:wipe": ["40", "擦汗", "Relief"],
        "/:dig": ["41", "抠鼻", "DigNose"],
        "/:handclap": ["42", "鼓掌", "Clap"],
        "/:and-(": ["43", "糗大了", "Shame"],
        "/:B-)": ["44", "坏笑", "Trick"],
        "/:lt@": ["45", "左哼哼", "Bah！L"],
        "/:@gt": ["46", "右哼哼", "Bah！R"],
        "/::-O": ["47", "哈欠", "Yawn"],
        "/:gt-|": ["48", "鄙视", "Lookdown"],
        "/:P-(": ["49", "委屈", "Wronged"],
        "/::.|": ["50", "快哭了", "Puling"],
        "/:X-)": ["51", "阴险", "Sly"],
        "/::*": ["52", "亲亲", "Kiss"],
        "/:@x": ["53", "吓", "Wrath"],
        "/:8*": ["54", "可怜", "Whimper"],
        "/:pd": ["55", "菜刀", "Cleaver"],
        "/:ltWgt": ["56", "西瓜", "Melon"],
        "/:beer": ["57", "啤酒", "Beer"],
        "/:basketb": ["58", "篮球", "Basketball"],
        "/:oo": ["59", "乒乓", "PingPong"],
        "/:coffee": ["60", "咖啡", "Coffee"],
        "/:eat": ["61", "饭", "Rice"],
        "/:pig": ["62", "猪头", "Pig"],
        "/:rose": ["63", "玫瑰", "Rose"],
        "/:fade": ["64", "凋谢", "Wilt"],
        "/:showlove": ["65", "示爱", "Lip"],
        "/:heart": ["66", "爱心", "Heart"],
        "/:break": ["67", "心碎", "BrokenHeart"],
        "/:cake": ["68", "蛋糕", "Cake"],
        "/:li": ["69", "闪电", "Lightning"],
        "/:bome": ["70", "炸弹", "Bomb"],
        "/:kn": ["71", "刀", "Dagger"],
        "/:footb": ["72", "足球", "Soccer"],
        "/:ladybug": ["73", "瓢虫", "Ladybug"],
        "/:shit": ["74", "便便", "Poop"],
        "/:moon": ["75", "月亮", "Moon"],
        "/:sun": ["76", "太阳", "Sun"],
        "/:gift": ["77", "礼物", "Gift"],
        "/:hug": ["78", "拥抱", "Hug"],
        "/:strong": ["79", "强", "ThumbsUp"],
        "/:weak": ["80", "弱", "ThumbsDown"],
        "/:share": ["81", "握手", "Shake"],
        "/:v": ["82", "胜利", "Victory"],
        "/:@)": ["83", "抱拳", "Fight"],
        "/:jj": ["84", "勾引", "Beckon"],
        "/:@@": ["85", "拳头", "Fist"],
        "/:bad": ["86", "差劲", "Pinky"],
        "/:lvu": ["87", "爱你", "Love"],
        "/:no": ["88", "NO", "No"],
        "/:ok": ["89", "OK", "OK"]
        // "/:love": ["90", "爱情", "InLove"],
        // "/:ltLgt": ["91", "飞吻", "Blowkiss"],
        // "/:jump": ["92", "跳跳", "Waddle"],
        // "/:shake": ["93", "发抖", "Tremble"],
        // "/:ltOgt": ["94", "怄火", "Aaagh!"],
        // "/:circle": ["95", "转圈", "Twirl"],
        // "/:kotow": ["96", "磕头", "Kotow"],
        // "/:turn": ["97", "回头", "Lookback"],
        // "/:skip": ["98", "跳绳", "Jump"],
        // "/:oY": ["99", "挥手", "Give-in"],
        // "/:#-0": ["100", "激动", "Hooray"],
        // "/:hiphot": ["101", "街舞", "HeyHey"],
        // "/:kiss": ["102", "献吻", "Smooch"],
        // "/:ltand": ["103", "左太极", "TaiJi L"],
        // "/:andgt": ["104", "右太极", "TaiJi R"]
    }
    //国际化的显示名字，1是中文 2是英文
    var titleIndex = 1;

    var getEmByName = function(name) {
        var emCode;
        for (key in em) {
            if (em[key][titleIndex] == name) {
                emCode = key;
                break;
            }
        }
        return emCode;
    };

    //textarea设置光标位置
    function setCursorPosition(ctrl, pos) {
        if (ctrl.setSelectionRange) {
            ctrl.focus();
            ctrl.setSelectionRange(pos, pos);
        } else if (ctrl.createTextRange) { // IE Support
            var range = ctrl.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
    }

    //获取多行文本框光标位置
    function getPositionForTextArea(obj) {
        var Sel = document.selection.createRange();
        var Sel2 = Sel.duplicate();
        Sel2.moveToElementText(obj);
        var CaretPos = -1;
        while (Sel2.inRange(Sel)) {
            Sel2.moveStart('character');
            CaretPos++;
        }
        return CaretPos;

    }

    function setValueToPosition(textarea, text, cpos) {
        var tclen = textarea.val().length;

        var tc = textarea.get(0);

        var pos = 0;
        if (typeof document.selection != "undefined") { //IE
            textarea.focus();
            setCursorPosition(tc, cpos); //设置焦点
            document.selection.createRange().text = text;
            //计算光标位置
            pos = getPositionForTextArea(tc);
        } else { //火狐
            //计算光标位置
            pos = tc.selectionStart + text.length;
            textarea.val(textarea.val().substr(0, tc.selectionStart) + text + textarea.val().substring(tc.selectionStart, tclen));
        }
        cpos = pos;
        setCursorPosition(tc, pos); //设置焦点 
    }
    $.fn.extend({
        jqfaceedit: function(options) {
            var defaults = {
                txtAreaObj: '', //TextArea对象
                containerObj: '', //表情框父对象
                // textareaid: 'msg',//textarea元素的id
                popName: '', //iframe弹出框名称,containerObj为父窗体时使用
                emotions: em, //表情信息json格式，id表情排序号 phrase表情使用的替代短语url表情文件名
                top: 0, //相对偏移
                left: 0 //相对偏移
            };

            var options = $.extend(defaults, options);
            var cpos = 0; //光标位置，支持从光标处插入数据
            var textareaid = options.textareaid;
            var removeFace = function() {
                options.containerObj.find('#face').closest(".dropdown").end().remove();
                options.containerObj.removeClass('acted');
            }
            return this.each(function() {
                var Obj = $(this);
                var container = options.containerObj;
                if (document.selection) { //ie
                    options.txtAreaObj.bind("click keyup", function(e) { //点击或键盘动作时设置光标值
                        e.stopPropagation();
                        cpos = getPositionForTextArea(options.txtAreaObj.get(0));
                    });
                }
                $(Obj).bind("click", function(e) {
                    // e.stopPropagation();
                    if ($(e.currentTarget).parent().is(".acted")) {
                        //阻止冒泡，避免导致失去.open样式
                        removeFace();
                        e.stopPropagation();
                        return;
                    }

                    var faceHtml = '<div id="face" class="dropdown-menu">';
                    // faceHtml += '<div id="texttb"><a class="close" title="关闭" href="javascript:void(0);">X</a></div>';
                    faceHtml += '<div id="facebox">';
                    faceHtml += '<div id="face_detail" class="facebox clearfix"><ul>';
                    var ems = options.emotions;
                    for (key in ems) {
                        var name = ems[key][0],
                            title = ems[key][titleIndex];
                        faceHtml += '<li text="[' + title + ']"><img title="' + title + '" src="/images/emotions/' + name + '.png"  style="cursor:pointer; position:relative;"   /></li>';
                    }
                    faceHtml += '</ul></div>';
                    // faceHtml += '</div><div class="arrow arrow_t"></div></div>';
                    // removeFace();
                    $(faceHtml).insertAfter($(e.currentTarget));
                    // container.append(faceHtml);

                    container.find("#face_detail ul >li").bind("click", function(e) {
                        var txt = $(this).attr("text");
                        // var faceText = txt;
                        setValueToPosition(options.txtAreaObj, txt, cpos);

                        removeFace();
                        //更改提交按钮的状态
                        container.find(".action-submit").addClass("btn-primary").removeClass("disabled");

                    });
                    //关闭表情框
                    container.find(".f_close").bind("click", function() {
                        removeFace();
                    });
                    //处理js事件冒泡问题
                    $('body').bind("click.emoticon", function(e) {
                        //TODO 点击删除表情框
                        /*console.log($(e.target));
                        if ($(e.target).hasClass('btn-emotion')) {
                            console.log('is btn');
                        }
                        return;*/
                        if (!$(e.target).closest(".btn-emotion").length) {
                            //如果是由dropdown-toggle触发的，不进行删除操作
                            removeFace();
                            $(this).unbind('click.emoticon');
                        }
                        // e.stopPropagation();
                    });
                    if (options.popName != '') {
                        $(window.frames[options.popName].document).find('body').bind("click.emoticon", function(e) {
                            e.stopPropagation();
                            removeFace();
                            $(this).unbind('emoticon.click');
                        });
                    }
                    container.find('#face').bind("click", function(e) {
                        e.stopPropagation();
                    });
                    var offset = $(e.target).offset();
                    // offset.top += options.top;
                    // offset.left += options.left;
                    container.find("#face").show();
                    $(e.currentTarget).parent().addClass('acted');
                });
            });
        },
        //表情文字符号转换为html格式
        emotionsToHtml: function(options) {
            return this.each(function() {
                var msgObj = $(this);
                msgObj.html($.emotionsToHtml(msgObj.html()));
            });
        },
        speechAble: function(speechInput, success) {
            return this.each(function() {
                var $input = $(this);
                var $speechInput = $(speechInput);
                $speechInput.on('webkitspeechchange', function() {
                    setValueToPosition($input, $speechInput.val(), 0);
                    if (success) {
                        success();
                    }
                });
            });
        }

    });

    $.extend({
        emotionsToHtml: function(orignalText) {
            var regx = new RegExp(emRegex, "ig");
            return orignalText.replace(regx, function(match) {
                var name = em[match][0],
                    title = em[match][titleIndex];
                return "<img class='emotion' title='" + title + "' src='/images/emotions/" + name + ".png' />";
            })
        },
        emotionsToName: function(orignalText) {
            var regx = new RegExp(emRegex, "ig");
            return orignalText.replace(regx, function(match) {
                return "["+em[match][titleIndex]+"]";
            })
        },
        emotionNameToCode: function(orignalText) {
            var regx = /(\[[\u4e00-\u9fa5]*\w*\]){1}/g;
            return orignalText.replace(regx, function(match) {
                var name = match.replace(/[\[|\]]/g, ''),
                    emCode = getEmByName(name);
                return emCode ? emCode : match;
            })
        }
    });

})(jQuery);