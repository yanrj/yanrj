angular.module('At', ['ngCaret'])
  .factory('AtUtils', function () {
    'use strict';

    var range = null;

    return {
      markRange: function () {
        range = this.getRange() || this.getIERange();
        return range;
      },

      getRange: function () {
        return window.getSelection ? window.getSelection().getRangeAt(0) : undefined;
      },

      getIERange: function () {
        return document.selection ? document.selection.createRange() : undefined;
      },

      getContent: function (element) {
        if (element.attr('contenteditable') === 'true') {
          return element.text();
        } else {
          return element.val();
        }
      },
      //匹配@符
      query: function (subtext, flag) {
        var regexp, match;

        regexp = new RegExp(flag + '([A-Za-z0-9_\\+\\-]*)$|' + flag + '([^\\x00-\\xff]*)$', 'gi');
        match = regexp.exec(subtext);

        if (match) {
          return match[2] || match[1];
        } else {
          return null;
        }
      },
      //插入“@+联系人 ”
      insert: function (element, content, data, query, range) {
        var insertNode, pos, sel, source, startStr, text;
        if (element.attr('contenteditable') === 'true') {
          insertNode = angular.element('<span contenteditable="false">@' + data + '&nbsp;</span>');

          if (window.getSelection) {
            pos = range.startOffset - (query.endPos - query.headPos) - 1;
            range.setStart(range.endContainer, Math.max(pos, 0));
            range.setEnd(range.endContainer, range.endOffset);
            range.deleteContents();
            range.insertNode(insertNode[0]);
            range.collapse(false);
            sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

          } else if (document.selection) {
            range.moveStart('character', query.endPos - query.headPos - 1);
            range.pasteHTML(insertNode[0]);
            range.collapse(false);
            range.select();
          }
        } else {
          source = element.val();
          startStr = source.slice(0, Math.max(query.headPos - 1, 0));
          text = startStr + '@' + data + ' ' + (source.slice(query.endPos || 0));
          element.val(text);
        }
      },

      select: {
        prev: function (cur, lists) {
          var prev;

          cur.removeClass('list-cur');
          prev = cur.prev();
          if (!prev.length) {
            prev = lists.last();
          }
          return prev.addClass('list-cur');
        },

        next: function (cur, lists) {
          var next;

          cur.removeClass('list-cur');
          next = cur.next();
          if (!next.length) {
            next = lists.first();
          }

          return next.addClass('list-cur');
        },

        choose: function (cur) {
          var content;

          cur.removeClass('list-cur');
          content = cur.find('span').text();

          return content;
        }
      }
    };
  })

  .directive('atUser',['UserSearchServ', '$http', '$timeout', 'Caret', 'AtUtils', 'PopMessage', 'GLOBAL_SETTING', 'ConversationBinder',
    function (UserSearchServ, $http, $timeout, Caret, AtUtils, PopMessage, GLOBAL_SETTING, ConversationBinder){
      return {
        restrict: 'EA',
        link: function (scope, element, attrs) {
          var subtext, caretOffset;
          var flag = attrs.flag || '@';
          var lineHeight = scope.lineHeight || 16;
          scope.isAtListHidden = true;

          scope.$watch(function () {
            return scope.caretPos;
          }, function (nowCaretPos) {

            if (angular.isDefined(nowCaretPos)) {
              scope.content = AtUtils.getContent(element);
              subtext = scope.content.slice(0, nowCaretPos);
              scope.query = AtUtils.query(subtext, flag);
              caretOffset = Caret.getOffset(element);

              if (scope.query === null) {
                scope.isAtListHidden = true;
              }

              if (angular.isString(scope.query) && scope.query.length <= 10) {
                if (scope.query === '' && element.next().attr('auto-follow') === 'true') {
                  scope.totalWidth = $('body').width();

                  if (scope.totalWidth - caretOffset.left < 121) {
                    scope.left = caretOffset.left - 120;
                  } else {
                    scope.left = caretOffset.left;
                  };

                  element.next().css({
                    left: scope.left,
                    top: caretOffset.top + lineHeight + -360
                  });
                }
                scope.query = {
                  'text': scope.query,
                  'headPos': nowCaretPos - scope.query.length,
                  'endPos': nowCaretPos
                };
              }
              //只有群聊，才可以@
              if (!ConversationBinder.getTriggerData()||ConversationBinder.getTriggerData().is_multi_user === false) {
                return;
              }

              if (angular.isObject(scope.query)) {
                // scope.isAtListHidden = false;
                scope.convId = ConversationBinder.getCurrentConvId();
                //从服务器获取数据，并显示出@的联系人
                $http({
                  url: GLOBAL_SETTING.URL + '/api/v1/autocomplete?c=' + scope.convId + '&models=user%3A10' + '&q=' + scope.query.text,
                  method: 'GET'
                }).success(function(response) {
                  scope.users = response;
                  if (scope.users.length === 0) {
                    scope.isAtListHidden = true;
                  } else {
                    scope.isAtListHidden = false;
                    $timeout(function () {
                      element.next().find('li').first().addClass('list-cur');
                    });
                  }
                });
              }
            }
          });
          //当元素失去焦点时发生 blur 事件
          element.bind('blur', function () {
            scope.isAtListHidden = true;
          });

          //绑定离开键盘事件
          element.bind('keyup', function (e) {
            //当用键盘左右移动光标到@时，不显示联系人列表
            if (e.keyCode === 37 || e.keyCode === 39) {
              return;
            }
            scope.$apply(function () {
              scope.caretPos = Caret.getPos(element);
            })
          });
        }
      }
    }
  ])

  .directive('autoComplete', function (
    Caret,
    AtUtils
  ) {
    'use strict';

    return {
      restrict: 'EA',
      link: function (scope, element) {
        var range;  
        var span = element.next();
        var keyCode = {
          up: 38,
          down: 40,
          enter: 13
        };

        scope.autoComplete = function (object) {
          element[0].focus();
          AtUtils.insert(element, scope.content, object.name, scope.query, range);
          Caret.setPos(element, scope.query.headPos + object.name.length + 1);
        };

        span.bind('mouseenter', function () {
          var lists = span.find('li');
          range = AtUtils.markRange();
          lists.removeClass('list-cur');
        });

        element.bind('keydown', function (e) {
          var ul = element.next().find('ul');
          var lists = ul.find('li');
          var cur = ul.children('.list-cur');
          if (scope.isAtListHidden === false) {

            switch (e.keyCode) {

            case keyCode.up:
              e.originalEvent.preventDefault();
              AtUtils.select.prev(cur, lists);
              break;

            case keyCode.down:
              e.originalEvent.preventDefault();
              AtUtils.select.next(cur, lists);
              break;

            case keyCode.enter:
              e.originalEvent.preventDefault();
              var insertContent = AtUtils.select.choose(cur);

              scope.$apply(function () {
                range = AtUtils.markRange();
                AtUtils.insert(element, scope.content, insertContent, scope.query, range);
                /* 当用键盘选择某个联系人时，点击回车键使得消息不要立即发送，然而当使用@联系人列表的隐藏时，
                 * 判断此时的点击回车操作，不进行提交，并不执行。
                 * 原因是当点击回车时，列表瞬间隐藏，所以用定时器延时列表隐藏事件
                */
                setTimeout(function () {
                  scope.isAtListHidden = true;
                },500);

              });
              Caret.setPos(element, scope.query.headPos + insertContent.length + 1);

              break;
            }
          }
        });
      }
    };
  });

