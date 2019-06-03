/**
 * checktree 封装ztree,提供全选/展开/最多选择/只展开一条路径/显示选择列表/默认选中/默认展开/查询/单选时父节点可选等功能
 * @namespace $.fn.checkTree
 * @author zhangzicao
 * @requires jquery,ztree
 * @version 3.2.0
 * @param  {array} zNodes 数据json
 * @param  {object} option 配置
 * @param  {string} option.title 列标题
 * @param  {string|number|boolean} option.limit=1 最多选择多少个,默认为1,单选。设为false为不限个数checkbox模式
 * @param  {Boolean} option.autoExpand=false 是否默认展开所有节点,设为'first'时只展开第一个父节点
 * @param  {Boolean} option.singlePath=false 是否只能有一条展开路径
 * @param  {Boolean} option.searchable=true 是否启用本地查询
 * @param  {Boolean|Array} option.checkAllable=true 是否全选功能
 * @param  {Boolean} option.checkLevelable=false 是否开启层级全选
 * @param  {Object|String} option.checkedData 默认选中的id列表，支持逗号隔开的string和Array
 * @param  {Boolean} option.showSelected=false 是否显示已选择列表
 * @param  {string} option.skin=default 皮肤类型，目前包括large、normal、all-folder、line-break等，多个类型直接可以用空格间隔分开
 * @param  {Boolean|Array} option.pNodeCheckable=false 父节点是否可选（选中父节点不再选中全部子节点）
 * @param  {Boolean} option.pNodeClickAction=expand 点击父节点的操作，默认是expand,可选check、none
 * @param  {Boolean} option.filterDeleted=true 是否过滤掉已删除的空数据。这里的已删除的数据指后台删除节点数据后，有已选中id但是无对应节点数据的那些数据。
 * @param  {Boolean} option.countChild=true 是否计算并显示子节点数量。需要注意的是异步模式下需要用户提供count字段。
 * @param  {function} option.onChange 选中变化时触发，onChange(changeNodes,treeId,action)，3个参数分别是1.变化的节点，2.树id，3.引起此次变化的操作。action包含7个值，分别是init(有默认选中时触发)、check（单个节点选中/取消事件触发）、checkAll（全选事件触发）、uncheckAll（全取消事件触发）、delete（已选列表delete按键或单个删除触发）、resetNodes（调用resetNodes时触发）、addNodes（调用addNodes时触发）
 * 
 * @param  {Object} option.key 自定义节点数据属性名，详细见ztree文档
 * @param  {Object} option.simpleData={enable:false} ztree的简单数据模式，详细见ztree文档
 * @param  {Boolean} option.simpleData.enable=false 是否启用
 * @param  {string} option.simpleData.idKey=id id键名
 * @param  {string} option.simpleData.pIdKey=pId 父id属性的键名
 * @param  {string} option.simpleData.rootPId=null 根节点id
 * @param  {object} option.view ztree配置
 * @param  {object} option.check ztree配置
 * @param  {object} option.async ztree异步加载配置
 * @return  {object} 返回ztree对象
 */
(function(root,factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node/CommonJS.
    module.exports = factory(require('jquery'));
  } else {
    // Browser globals.
    factory(root.jQuery);
  }
})(this,function(jquery){
  var $ = jquery;
  $.fn.checkTree=function(zNodes,option) {
    var checkedNodes=[],checkedNodeIds=[];
    var $container=$(this);
    var opt=option;
    option=$.extend({
      title:"",
      limit:1,
      autoExpand:false,
      singlePath:false,
      pNodeCheckable:false,
      searchable:true //是否开启查询功能
      ,checkAllable:true //是否全选功能
      ,checkLevelable:false //是否开启层级全选
      ,showSelected:false //是否显示已选择列表
      ,pNodeClickAction:"expand" //点击父节点的操作，默认是expand,可选check、none
      ,filterDeleted:true //是否过滤掉已删除的空数据。这里的已删除的数据指后台删除节点数据后，有已选中id但是无name的那些数据。
      ,countChild:true //是否计算并显示子节点数量。需要注意的是异步模式下需要用户提供count字段
      ,skin:"default" //皮肤类型，目前只包括large，多个类型直接可以用间隔分开
      ,simpleData:{enable:false} //是否开启简单数据格式，详细介绍见ztree文档
      ,checkedData:[] //默认选中的id列表，支持逗号隔开的string和Array
      ,view:{}
    },opt,{
      key:$.extend({ checked : "checked", children : "children", isParent : "isParent", isHidden : "isHidden", name : "name", title : "", url : "url" },opt.key)
    });

    var asyncEnable=option.async && option.async.enable;//异步模式

    var limit=1; //最多选择的数量
    if (option.limit==false||option.limit=='false')
        limit=100000;
    else if (!option.limit)
      limit=1;
    else if (!isNaN(parseInt(option.limit)))
      limit=parseInt(option.limit)

    //单选时或pNodeCheckable、异步模式下下全选按钮不启用
    if(limit==1 || option.pNodeCheckable || asyncEnable){
      option.checkAllable=false
    }

    //单选时全选当前层级按钮不启用
    if(limit==1 ){
      option.checkLevelable=false
    }

    if(option.check && option.check.enable===false){
      //不启用选择框时的参数
      option.checkLevelable=false
      option.checkAllable=false
    }

    //皮肤设置
    if(option.skin){
      var skinArr=option.skin.split(" ")
      var skinClass="";
      $.each(skinArr,function(i,skin) {
        if (skin==="") return;
        skinClass+=" skin-"+skin
      })
      $container.addClass(skinClass)
    }

    var $col=$('<div class="checktree-col">'+
                  (option.title?
                  '<div class="checktree-title">'+option.title+'</div>':'')+
                  (option.searchable?
                    '<div class="checktree-search">\
                        <div class="checktree-search-wr">\
                          <i class="checktree-search-icon"></i>\
                          <input type="text" class="checktree-search-input" placeholder="请输入关键字">\
                        </div>\
                    </div>':'')+
                  (option.checkAllable?
                  '<div class="checktree-actions">\
                    <a href="javascript:;" class="checktree-check_all">[全选]</a>\
                  </div>':'')+
                  '<div class="checktree-content">\
                    <ul class="ztree checktree-tree" id="tree'+($('.ztree').length+1)+'">\
                    </ul>\
                  </div>\
                </div>');
    if($container.find('.checktree-col').length===0){
      $container.append($col);
    }else{
      $container.find('.checktree-col').not('.checktree-selected-list').last().after($col);
    }

    if( option.showSelected ){
      $container.find('.checktree-selected-list').length===0 && $container.append('<div class="checktree-col checktree-selected-list">\
          <div class="checktree-title">已选列表</div>\
          <div class="checktree-actions">\
            <a class="checktree-delete_all" href="javascript:;">[删除全部]</a>\
          </div>\
          <div class="checktree-content checktree-selected-list__content"></div>\
        </div>');
      var $selectedList = $container.find('.checktree-selected-list')
    }

    //列宽计算
    $container.find('.checktree-col').css("width",parseInt(10000/$container.find('.checktree-col').length)/100+"%")
    //树容器高度计算
    $col.find('.checktree-content').css('height',$col.height()-($col.find('.checktree-title').outerHeight()||0)-($col.find('.checktree-search').outerHeight()||0)-($col.find('.checktree-actions').outerHeight()||0)+'px') 
    
    var $tree=$col.find('.checktree-tree')
    var zTreeObj;
    var curExpandNode = null;//当前展开路径

    var watingAsyncNodesIndex=null
    var watingAsyncNode=null
    // zTree 的参数配置，深入使用请参考 API 文档（setting 配置详解）
    var setting = {
      data:{
        simpleData: option.simpleData,
        key:option.key
      },
      check:$.extend({
        autoCheckTrigger : false,
        chkboxType : option.pNodeCheckable&&limit!==1?{"Y": "", "N": ""}:{"Y": "ps", "N": "ps"},
        chkStyle : limit==1?'radio':"checkbox",
        enable : true,
        nocheckInherit : false,
        chkDisabledInherit : false,
        radioType : "all"
      },option.check),
      async:$.extend({enable:false},option.async,{
        dataFilter:function (treeId, parentNode, childNodes) {
          if(option.async.dataFilter)
            childNodes = option.async.dataFilter(treeId, parentNode, childNodes);

          //pNodeCheckable设置
          var lv,nocheck;
          if(option.pNodeCheckable instanceof Array){
            if(parentNode==null)
              lv=1;
            else
              lv=parentNode.level+2;
          }
          var hdf=function(child,level){
            if(level) nocheck=$.inArray(level,option.pNodeCheckable)==-1;
            $.each(child,function (i,node) {
              var index=$.inArray(node[idkey]+"",checkedNodeIds);
              if(index>-1){
                node[option.key.checked]=true;
                //color设置
                if(node.font && node.font.color){
                  $('.'+zTreeObj.setting.treeId+'-selected-list__item[data-id="'+node[idkey]+'"]').css('color', node.font.color)
                }
              }
              if(node[option.key.isParent] && nocheck){
                node.nocheck=true
              }
              if(node.children) hdf(node.children,level?level+1:null)
            });
          }
          hdf(childNodes,lv)
          return childNodes;
        }
      }),
      callback: {
        onClick:function(event,treeId,treeNode) {
          if (!treeNode[option.key.isParent]){
            if(treeNode.getCheckStatus())
              zTreeObj.checkNode(treeNode, !treeNode.getCheckStatus().checked, true, true);
          }
          else{
            if(option.pNodeClickAction=='expand')
              zTreeObj.expandNode(treeNode,undefined, false, true, true)
            else if(option.pNodeClickAction=='check'){
              if(treeNode.getCheckStatus())
                zTreeObj.checkNode(treeNode, !treeNode.getCheckStatus().checked, true, true);
            }
          }
        },
        beforeCheck:function(treeId, treeNode) {
          if (!treeNode.getCheckStatus()||treeNode.getCheckStatus().checked) return
          //以下几种阻止选中的情况：
          if (limit==1) {
            //单选点击父节点，父节点不可选时
            if (treeNode[option.key.isParent]&&!option.pNodeCheckable)
              return false
          }else{
            if(!option.pNodeCheckable){
              //多选点击，父节点为全选子节点时，选中数量超出
              var num;
              var checkNum=zTreeObj.getNodesByFilter(function (node) {
                return node[option.key.checked] && !node[option.key.isParent]
              }).length;
              if (treeNode[option.key.isParent] && (treeNode.count||!asyncEnable))
                num=treeNode.count||getChildNodeNum(treeNode,'unchecked')+checkNum
              else
                num=(treeNode.count==null?1:treeNode.count)+checkNum
              if (num>limit) {
                parent.layer.msg('最多选择'+limit+'项',{time: 1200})
                return false
              }
            }else{
              //多选点击，父节点可选时（非全选子节点），选中数量超出
              var checkNum=zTreeObj.getNodesByFilter(function (node) {
                return node[option.key.checked]
              }).length;
              if (checkNum+1>limit) {
                parent.layer.msg('最多选择'+limit+'项',{time: 1200})
                return false
              }
            }

            if(asyncEnable && !option.pNodeCheckable && treeNode[option.key.isParent]){
              //异步模式pNodeCheckable=false时，选中父节点要先加载所有未加载的子节点
              var node=zTreeObj.getNodesByFilter(function (node) {
                return node.zAsync===false
              },true,treeNode);
              if(node || treeNode.zAsync===false){
                watingAsyncNodesIndex=parent.layer.load()
                watingAsyncNode=treeNode.tId;
                if(!zTreeObj.setting.async.otherParam) zTreeObj.setting.async.otherParam={};
                zTreeObj.setting.async.otherParam.child=true;
                zTreeObj.reAsyncChildNodes(treeNode,'refresh',true)
                return false
              }
            }
          }
        },
        onCheck:function(event, treeId, treeNode) {
          if(asyncEnable && !treeNode.zAsync){

          }
          afterChange('check')
          updateCheckState('auto')
        },
        beforeExpand:function(treeId, treeNode) {
          if (!asyncEnable && (!treeNode[option.key.children]||treeNode[option.key.children].length==0)||treeNode[option.key.isParent]===false) {return false;}
          //路径单选
          if (option.singlePath)
            singlePath(treeNode)
        },
        onExpand:function(event, treeId, treeNode) {
          curExpandNode = treeNode;
        },
        onAsyncSuccess:function (event, treeId, treeNode, msg) {
          if(!hadExpandFirst) expandFirst();
          if(watingAsyncNode && treeNode.tId==watingAsyncNode){
            parent.layer.close(watingAsyncNodesIndex)
            watingAsyncNodesIndex=watingAsyncNode=null
            zTreeObj.setting.async.otherParam.child=false;
            zTreeObj.checkNode(treeNode,true,true,true);
          }
        },
        onAsyncError:function (event, treeId, treeNode) {
          if(watingAsyncNode && treeNode.tId==watingAsyncNode){
            parent.layer.close(watingAsyncNodesIndex)
            watingAsyncNodesIndex=watingAsyncNode=null
            zTreeObj.setting.async.otherParam.child=false;
          }
        }
      },
      view:$.extend({
        showLine: true,
        showIcon: false,
        expandSpeed:'fast',
        fontCss: function(treeId, node) {
          return node.font ? node.font : {};
        },
      },option.view,{
        addDiyDom:function(treeId, treeNode) {
          //自定义dom
          if (!treeNode[option.key.isParent]){
             $("#" + treeNode.tId).addClass('not-parent');
          }else{
             $("#" + treeNode.tId).addClass('is-parent');
          }
          if(option.countChild && (!asyncEnable||typeof treeNode.count!=="undefined")){
            var aObj = $("#" + treeNode.tId + "_a");
            if (treeNode[option.key.isParent]){
              var num = $("<span class='ext'></span>").text('（'+(treeNode.count||getChildNodeNum(treeNode))+'）')
              aObj.append(num);
            }
          }
          if( $("#" + treeNode.tId).siblings(".check-all-item").length==0 && ((option.checkLevelable===true&&treeNode.level>0)|| (option.checkLevelable instanceof Array && $.inArray(treeNode.level+1,option.checkLevelable)>-1)) ){
            var unchecknode=zTreeObj.getNodesByFilter(function (node) {
              return node.parentTId==treeNode.parentTId && node.getCheckStatus() && !node[option.key.checked]
            },true,treeNode.getParentNode());
            //启用全选该层级的按钮
            $("#" + treeNode.tId).parent('ul').prepend('<li class="not-parent check-all-item '+(unchecknode?'':'checked')+'" data-pid="'+treeNode.parentTId+'"><span class="button switch center_docu"></span><span class="button chk '+(unchecknode?'checkbox_false_full':'checkbox_true_full')+'"></span><a src="javascript:;"><span class="node_name" style="font-weight: bold;">全选</span></a></li>')
          }
          option.view.addDiyDom && option.view.addDiyDom(treeId, treeNode, option)
        }
      })
    };

    //展开全部、父节点禁用勾选
    var chkAllflag=option.autoExpand===true&&!option.singlePath;
    var pncflag=!option.simpleData.enable && option.pNodeCheckable instanceof Array;
    if(chkAllflag||pncflag){
      var hd=function(ar,lv) {
        var nocheck;
        if(pncflag && $.inArray(lv,option.pNodeCheckable)==-1){
            nocheck=true
        }
        $.each(ar,function(i,node) {
          if(node[option.key.isParent] || node[option.key.children]){
            if(chkAllflag) node.open = true;
            if(nocheck) node.nocheck=true;
            if(node[option.key.children]&&node[option.key.children].length>0)
              hd(node[option.key.children],lv+1);
          }
        });
      };
      zNodes && hd(zNodes,1);
    }
    zTreeObj = $.fn.zTree.init($tree, setting, zNodes);

    //展开第一个节点
    var hadExpandFirst=true;
    if(option.autoExpand === 'first'){
      if(!asyncEnable)   expandFirst();
      else hadExpandFirst=false;
      option.autoExpand=false;
    }

    var idkey=(option.simpleData.enable?option.simpleData.idKey:option.key.id)||"id";

     //默认选中
    checkedNodes=[].concat(typeof option.checkedData==='string'?option.checkedData.split(','):option.checkedData);
    var emptyIndex=$.inArray("",checkedNodes);
    if( emptyIndex>-1){
      checkedNodes.splice(emptyIndex,1);
    }
    if(checkedNodes.length>0){
      var idata,idata0,inodes;
      for(var i=checkedNodes.length-1; i>=0 ; i--){
        idata=checkedNodes[i];
        if(typeof idata!=='object'){
          idata0={}
          idata0[option.key.name]="???";
          idata0[idkey]=idata;
          idata=idata0;
          checkedNodes.splice(i,1,idata);
        }
        idata.notInited=true;
        inodes=zTreeObj.getNodesByFilter(function(node) {
          return node[idkey]==idata[idkey];
        });
        if(inodes && inodes.length>0){
          $.each(inodes,function (j,node) {
            zTreeObj.checkNode(node,true,true,false);
            checkedNodes.splice(i,1,node);
          });
        }else if( option.filterDeleted && ( typeof idata[option.key.name]=="undefined" || idata[option.key.name]=="???" || idata[option.key.name]==""|| idata[option.key.name]==null) ){
          checkedNodes.splice(i,1);
          break;
        }
        checkedNodeIds.push(idata[idkey]+"")
      }
      afterChange("init");
      updateCheckState('auto');
    }

    if (limit==100000 && option.checkAllable) {
      //全选操作
      $col.find('.checktree-check_all').on('click',function() {
        var allChecked=$(this).hasClass('inverse');
        zTreeObj.checkAllNodes(!allChecked);
      });
    }

    if( option.checkLevelable){
      //全选当前层级所有节点
      $container.on("click",".check-all-item",function() {
          if($(this).hasClass("checked")){
            //取消全选
            $(this).removeClass("checked");
            $(this).find('.chk').removeClass('checkbox_true_full').addClass('checkbox_false_full')
            var ch=false
          }else{
            //全选
            $(this).addClass("checked")
            $(this).find('.chk').removeClass('checkbox_false_full').addClass('checkbox_true_full')
            var ch=true
          }
          var pid=$(this).data("pid");
          var nodes=zTreeObj.getNodeByTId(pid).children;
          $.each(nodes,function(i,node) {
            zTreeObj.checkNode(node,ch,false,true)
          })
      });
    }

    if (option.autoExpand) {
      //默认展开一条路径
      if (option.singlePath) {
        expandFirst();
      }
    }

    //筛选
    if(option.searchable){
      $col.find('.checktree-search-input').on('keyup',function(e) {
        if (e.keyCode!=13&&e.keyCode!=108) {return;}
        var key=$(this).val();

        if(asyncEnable){
          //异步模式下使用后台查询
          if(!zTreeObj.setting.async.otherParam) zTreeObj.setting.async.otherParam={};
          zTreeObj.setting.async.otherParam.keyWord=key;
          zTreeObj.reAsyncChildNodes(null, "refresh");
        }else{
          if(key.length===0){
            var sp1=zTreeObj.setting.view.expandSpeed;
            zTreeObj.setting.view.expandSpeed="";
            zTreeObj.expandAll(false);
            zTreeObj.setting.view.expandSpeed=sp1;
            var rsNodes=zTreeObj.getNodesByFilter(function() {return true;});
          }else{
            var nodes = zTreeObj.getNodesByFilter(function(node) {
              return !node[option.key.isHidden||"isHidden"];
            });
            zTreeObj.hideNodes(nodes);
            var rsNodes = zTreeObj.getNodesByParamFuzzy([option.key.name||"name"], key, null);
            var nodearr=rsNodes;
            $.each(nodearr,function(i,node) {
              while(node){
                node=node.getParentNode();
                if(node&&$(rsNodes).filter(function(j,jnode) {
                  return jnode.tId==node.tId
                }).length==0){
                  rsNodes.push(node)
                }
              }
            })
          }

          zTreeObj.showNodes(rsNodes);
          if(option.autoExpand&&option.singlePath) expandFirst();

          if(option.showSelected){
            $selectedList.find("."+zTreeObj.setting.treeId+"-selected-list__item").addClass("disabled")
            var rsDom=$(rsNodes).map(function(i,node) {
              return $selectedList.find("."+zTreeObj.setting.treeId+"-selected-list__item[data-id='"+node[idkey]+"']").get()
            });
            $(rsDom).removeClass("disabled")
          }
        }
      })
    }

    // 取消选中
    if(option.showSelected){
      $selectedList.on("click",".close",function () {
        deleteItem.call(this)
        afterChange('delete');
        updateCheckState('auto');
      })
      function deleteItem() {
        var $item=$(this).closest(".checktree-selected-list__item");
        if($item.hasClass("disabled"))return;
        var id=$item.data('id');
        var itemNodes=zTreeObj.getNodesByFilter(function(node) {
          return node[idkey]==id;
        });
        if (itemNodes && itemNodes.length>0) {
          $.each(itemNodes,function (i,itemNode) {
            zTreeObj.checkNode(itemNode,false,true,false)
          })
        }
        if(asyncEnable){
          //async模式下
          var index=$.inArray(id+"",checkedNodeIds);
          if(index>-1){
            checkedNodes.splice(index,1)
            checkedNodeIds.splice(index,1)
          }
        }
        id && $item.siblings("."+zTreeObj.setting.treeId+'-selected-list__item[data-id="'+id+'"]').remove();
        $item.remove();
      }
      //删除所有
      $selectedList.on("click",".checktree-delete_all",function() {
        if(option.checkAllable){
          $col.find(".checktree-check_all").removeClass('inverse')
        }
        zTreeObj.checkAllNodes(false);
      });
      //ctrl、shift选中删除
      $selectedList.off("click.checktree").on("click.checktree",".checktree-selected-list__item",function(e) {
        if(e.ctrlKey){
          $(this).toggleClass('selected')
          $(this).addClass('current').siblings().removeClass('current')
        }else if(e.shiftKey){
          $(this).addClass('selected').siblings().removeClass('selected')
          if($(this).is($(this).siblings('.current').prevAll())){
            $(this).nextUntil('.current').addClass('selected')
            $(this).nextAll('.current').addClass('selected')
          }else{
            $(this).prevUntil('.current').addClass('selected')
            $(this).prevAll('.current').addClass('selected')
          }
        }else{
          $(this).toggleClass('selected').siblings().removeClass('selected')
          $(this).addClass('current').siblings().removeClass('current')
        }
      })
      $selectedList.off("selectstart.checktree").on("selectstart.checktree",".checktree-selected-list__item",function(e) {
        //阻止用户选字
        e.preventDefault()
      })
      $('body').on("keyup.checktree",function(e) {
        //delete删除
        var selectedItems=$selectedList.find('.'+zTreeObj.setting.treeId+'-selected-list__item.selected');
        if(e.keyCode===46 && selectedItems.length>0){
          selectedItems.each(function () {
            deleteItem.call(this)
          })
          afterChange('delete');
          updateCheckState('auto');
        }
      })
    }

    //选中操作后触发，更新选中列表
    function afterChange(action) {
      var changeNodes=zTreeObj.getChangeCheckedNodes();
      var isInit=false;
      if(action=='init'){
        isInit=true;
        changeNodes=checkedNodes;
      }

      if(!isInit && asyncEnable && setting.check.chkStyle === "radio" && checkedNodeIds.length>0){
        //异步模式单选选中时，取消未加载节点的选中
        checkedNodeIds=[];
        checkedNodes=[];
        $selectedList.find("."+zTreeObj.setting.treeId+'-selected-list__item').remove();
      }

      var changedParentNodes=[];//变化节点的父节点合集，用于更新层级全选的状态
      $.each(changeNodes,function (j,node) {
        if(option.showSelected){
          if(isInit || !node[option.key.isParent] || option.pNodeCheckable){
            if(isInit || node[option.key.checked]){
              var html='<div class="checktree-selected-list__item '+zTreeObj.setting.treeId+'-selected-list__item" data-id="'+node[idkey]+'" data-treeid="'+zTreeObj.setting.treeId+'" '+(node.font&&node.font.color?' style="color:'+node.font.color+'"':'')+'>'+
                  (node[option.key.name]||"name")+
                  '<i class="close">&times;</i>\
                  </div>';
              var lastNode=$selectedList.find("."+zTreeObj.setting.treeId+"-selected-list__item").last();
              if(lastNode.length>0){
                lastNode.after(html)
              }else if(zTreeObj.setting.treeId==='tree1' && $selectedList.find(".tree2-selected-list__item,.tree3-selected-list__item").length>0){
                $selectedList.find(".tree2-selected-list__item,.tree3-selected-list__item").first().before(html)
              }else if(zTreeObj.setting.treeId==='tree2' && $selectedList.find(".tree3-selected-list__item").length>0){
                $selectedList.find(".tree3-selected-list__item").first().before(html)
              }else{
                $selectedList.find(".checktree-selected-list__content").append(html)
              }
            }else{
              $selectedList.find("."+zTreeObj.setting.treeId+"-selected-list__item[data-id=\""+node[idkey]+"\"]").remove()
            }
          }
        }
        if(!isInit){
          var index=$.inArray(node[idkey]+"",checkedNodeIds);
          if(node[option.key.checked] && index==-1 &&(!node[option.key.isParent] || option.pNodeCheckable)){
            //选中数据添加
            checkedNodes.push(node)
            checkedNodeIds.push(node[idkey]+"")
          }else if(index>-1){
            //非选中数据删除
            checkedNodes.splice(index,1)
            checkedNodeIds.splice(index,1)
          }
        }
        if(option.checkLevelable){
          //记录已变化的节点的父id
          var pid=node.parentTId;
          if($.inArray(pid,changedParentNodes)===-1){
            changedParentNodes.push(pid)
          }
        }
        node.checkedOld=node[option.key.checked];
      });
      if(changedParentNodes.length>0){
        //更新变化的父节点下的层级全选
        $.each(changedParentNodes,function (i,pid) {
          var $ul=$("#" + pid).children('ul');
          var $chk=$ul.children('.check-all-item');
          var unchecknode=zTreeObj.getNodesByFilter(function (node) {
            return node.parentTId==pid && node.getCheckStatus() && !node[option.key.checked]
          },true,zTreeObj.getNodeByTId(pid));
          if(unchecknode){
            $chk.removeClass('checked')
            $chk.find('.chk').removeClass('checkbox_true_full').addClass('checkbox_false_full')
          }else{
            $chk.addClass('checked')
            $chk.find('.chk').addClass('checkbox_true_full').removeClass('checkbox_false_full')
          }
        })
      }
      option.onChange && option.onChange(changeNodes,zTreeObj.setting.treeId,action)
    }

    //更新全选状态
    function updateCheckState(allChecked) {
      if(option.checkAllable){
        if(allChecked==='auto'){
          var nodes=zTreeObj.getNodes();
          allChecked=true;
          for (var i = nodes.length - 1; i >= 0; i--) {
            if (!nodes[i][option.key.isHidden]&&(!nodes[i].getCheckStatus().checked||nodes[i].getCheckStatus().half)) {
              allChecked=false
              break
            }
          }
        }
        if(allChecked){
          $col.find(".checktree-check_all").addClass('inverse').text('[取消]')
        }else{
          $col.find(".checktree-check_all").removeClass('inverse').text('[全选]')
        }
      }
    }

    //获取某个节点的所有子节点个数
    function getChildNodeNum(node,checkState){
      var num=0;
      var childNodes=node[option.key.children]||[];
      for (var i = 0; i < childNodes.length; i++){
        if(!childNodes[i][option.key.isParent]){
          if(!checkState || (checkState==='checked')===!!childNodes[i][option.key.checked||"checked"])
            num++
        }
        else
          num+=getChildNodeNum(childNodes[i],checkState)
      }
      return num
    }

    //展开第一个节点
    function expandFirst() {
      var nodes=zTreeObj.getNodes();
      var firstP,firstN;
      firstN=zTreeObj.getNodesByFilter(function(node) {
          return node[option.key.isParent]!==true&&node[option.key.checked||"checked"]==true&&!node[option.key.isHidden||"isHidden"]
      },true);
      if (!firstN) {
        firstN=zTreeObj.getNodesByFilter(function(node) {
            return node[option.key.isParent]!==true&&!node[option.key.isHidden||"isHidden"]
        },true);
      }
      if (!firstN) {
        firstN=zTreeObj.getNodesByFilter(function(node) {
            return node[option.key.isHidden||"isHidden"]
        },true);
      }
      if (firstN) firstP=firstN.getParentNode();
      if (!firstP) {
        firstP=$(nodes).filter(function(i,item) {
          return item[option.key.isParent]==true&&(item[option.key.checked||"checked"]==true||item.halfCheck==true||item.check_Child_State>=1)&&!item[option.key.isHidden||"isHidden"]
        }).get(0);
      }
      if (!firstP) {
        firstP=$(nodes).filter(function(i,item) {
          return item[option.key.isParent]==true&&!item[option.key.isHidden||"isHidden"]
        }).get(0)
      }
      if (firstP)
        zTreeObj.expandNode(firstP,true,false,true,true);//展开第一个节点
    }

    //路径单选
    function singlePath(treeNode) {
      var pNode = curExpandNode ? curExpandNode.getParentNode():null;
      var treeNodeP = treeNode.parentTId ? treeNode.getParentNode():null;
      for(var i=0, l=!treeNodeP ? 0:treeNodeP[option.key.children].length; i<l; i++ ) {
        //收起目标的兄弟节点
        if (treeNode !== treeNodeP[option.key.children][i]) {
          zTreeObj.expandNode(treeNodeP[option.key.children][i], false);
        }
      }
      var tmpRoot,tmpTId,rootNodes;
      while (pNode) {
        if (pNode === treeNode) {
          break;
        }
        pNode = pNode.getParentNode();
      }
      if (!pNode) {
        if (treeNode === curExpandNode) return;
        if (!curExpandNode) {
          tmpRoot = treeNode;
          while (tmpRoot) {
            tmpTId = tmpRoot.tId;
            tmpRoot = tmpRoot.getParentNode();
          }
          rootNodes = zTreeObj.getNodes();
          for (i=0, j=rootNodes.length; i<j; i++) {
            n = rootNodes[i];
            if (n.tId != tmpTId) {
              zTreeObj.expandNode(n, false);
            }
          }
        } else if (curExpandNode && curExpandNode.open) {
          if (treeNode.parentTId === curExpandNode.parentTId) {
            zTreeObj.expandNode(curExpandNode, false);
          } else {
            var newParents = [];
            while (treeNode) {
              treeNode = treeNode.getParentNode();
              if (treeNode === curExpandNode) {
                newParents = null;
                break;
              } else if (treeNode) {
                newParents.push(treeNode);
              }
            }
            if (newParents!=null) {
              var oldNode = curExpandNode;
              var oldParents = [];
              while (oldNode) {
                oldNode = oldNode.getParentNode();
                if (oldNode) {
                  oldParents.push(oldNode);
                }
              }
              if (newParents.length>0) {
                zTreeObj.expandNode(oldParents[Math.abs(oldParents.length-newParents.length)-1], false);
              } else {
                zTreeObj.expandNode(oldParents[oldParents.length-1], false);
              }
            }
          }
        }
        curExpandNode = treeNode;
      }
    }

    //全选或取消全选
    if(!zTreeObj.originCheckAllNodes) zTreeObj.originCheckAllNodes=zTreeObj.checkAllNodes;
    zTreeObj.checkAllNodes=function(checked) {
        if(setting.check.chkStyle === "radio"){
          var chkNodes=zTreeObj.getCheckedNodes(true)
          if(!checked && chkNodes.length>0){
            zTreeObj.checkNode(chkNodes[0],false,true,false)
            afterChange('uncheckAll');
            updateCheckState(false);
          }
        }else{
          zTreeObj.originCheckAllNodes(checked)
          afterChange(checked?'checkAll':'uncheckAll');
          updateCheckState(checked);
        }
        if(!checked){
          $selectedList.find("."+zTreeObj.setting.treeId+'-selected-list__item').remove();
          checkedNodeIds=[];
          checkedNodes=[];
        }
    }

    //重新渲染方法
    zTreeObj.resetNodes=function(dt) {
      zTreeObj.destroy();
      $.fn.zTree.init($tree,zTreeObj.setting,dt);
      $.each(zTreeObj.checkedData,function(i,data) {
        var node=zTreeObj.getNodesByParam(idkey,data[idkey]);
        node&&node.length>0&&zTreeObj.checkNode(node[0],true,true,false);
      });
      afterChange('resetNodes')
      updateCheckState('auto')
      if(option.autoExpand && option.singlePath) expandFirst()
    }

    //重写添加方法
    if(!zTreeObj.originAddNodes) zTreeObj.originAddNodes=zTreeObj.addNodes;
    zTreeObj.addNodes=function(parentNode, index, newNodes, isSilent) {
      zTreeObj.originAddNodes(parentNode, index, newNodes, isSilent)
      $.each(checkedNodeIds,function(i,id) {
        var nodes=zTreeObj.getNodesByParam(idkey,id);
        nodes&&nodes.length>0&&!$.each(nodes,function(i,node) {
          if(!node[option.key.checked||"checked"]){
            zTreeObj.checkNode(node,true,true,false);
            //color设置
            if(node.font && node.font.color){
              $('.'+zTreeObj.setting.treeId+'-selected-list__item[data-id="'+node[idkey]+'"]').css('color', node.font.color)
            }
          }
        })
      });
      afterChange('addNodes')
      updateCheckState('auto')
    }

    //重写destroy方法
    if(!zTreeObj.originDestroy) zTreeObj.originDestroy=zTreeObj.destroy;
    zTreeObj.destroy=function() {
      $col.find('.checktree-check_all').off('click');
      $col.find('.checktree-search-input').off('keyup');
      $selectedList.off("click",".close")
      $selectedList.off("click")
      $selectedList.off("click.checktree")
      $selectedList.off("selectstart.checktree")
      $('body').off("keyup.checktree")
      zTreeObj.originDestroy()
    }

    //获取选中数据
    zTreeObj.getCheckedData=function() {
      return checkedNodes
    }

    zTreeObj.expandFirst = expandFirst

    return zTreeObj;
  }
})

if(typeof GetQuery=="undefined"){
  //获取查询参数的值
  function GetQuery(key) { 
    var search = location.search.slice(1); //得到get方式提交的查询字符串 
    var arr = search.split("&"); 
    for (var i = 0; i < arr.length; i++) { 
      var ar = arr[i].split("="); 
      if (ar[0] == key) { 
      return decodeURI(ar[1]);
      } 
    } 
    return null;
  } 
}