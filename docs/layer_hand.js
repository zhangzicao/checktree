/**
 * 弹窗并实现窗口之间数据传递。本方法会通过url为弹窗页面提供1个变量名称（dataName），1个回调方法名称（callbackName）。弹窗页面通过parent[dataName]可以拿到传过来的数据，通过调用方法 parent[callbackName](data) 可以把data数据传回去。拿到的数据要用JSON.parse解析，数据传回去之前要用JSON.stringify将数据转为字符串（父页面收到后会parse处理）。
 * @param  {string}   url    弹窗目标，必填
 * @param  {string|boolean}   title  弹窗标题，必填
 * @param  {number|string}   [w]      弹窗宽，选填
 * @param  {number|string}   [h]      弹窗高，选填
 * @param  {array}   [inputs]  选填，通过input数组快速传递数据，这种情况下来回传递的数据均为数组格式，依次为inputs数组每个input对应的表单值。
 * @param  {string|object}   inputs[] 快速传递数据时使用的目标input的选择器或对象。
 * @param  {object}   [option] 配置参数，支持layer插件所有配置，选填
 * @param  {boolean}   option.stamp=true 提供给弹窗页面的变量名/函数名是否添加随机数字
 * @param  {string}   option.target 弹窗弹出位置，默认当前窗口，可填"parent"或"top"
 * @param  {object}   option.data 弹窗传递过去的数据。inputs参数存在时这个参数失效
 * @param  {number}   option.inputsAction=1 inputs快捷操作类型，1代表把input里数据传过去也把传回来的数据填充到input里，2代表只把input里的数据传过去不对传回来的数据做操作，3代表不传input里的数据过去只把传回来的数据填入input内
 * @param  {Function} [callback]     弹窗页面调用call方法时会触发的回调，参数为传输过来的数据，选填
 * @author zhangzicao
 * @version 0.0.1
 * @requires jquery,layer
 */
function layer_hand(url,title,w,h,inputs,option,callback){
  if (!url) return;
  //非必选转换
  if(w instanceof Array) callback=inputs, option=h, inputs=w,h=null,w=null;
  if((!(w instanceof Array))&&typeof w=="object"&&w!==null) callback=h, option=w, inputs=null,h=null,w=null;
  if((!(w instanceof Array))&&typeof w=="function") callback=w, option=null, inputs=null,h=null,w=null;
  if (!w) w=300;
  if(h instanceof Array) callback=option, option=inputs, inputs=h,h=null;
  if((!(h instanceof Array))&&typeof h=="object"&&h!==null) callback=inputs, option=h, inputs=null,h=null;
  if((!(h instanceof Array))&&typeof h=="function") callback=h, option=null, inputs=null,h=null;
  if (!h) h=530;
  if((!(inputs instanceof Array))&&typeof inputs=="object"&&inputs!==null) callback=option, option=inputs, inputs=null;
  if((!(inputs instanceof Array))&&typeof inputs=="function") callback=inputs, option=null, inputs=null;
  if (!inputs) inputs=[];
  if(typeof option=="function") callback=option, option=null;
  if (!option) option={};

  // option默认值
  option=$.extend({
    stamp:true //是否给变量、方法添加随机后缀以兼容多个弹窗同时出现
    ,inputsAction: 1 //inputs快捷操作类型，1代表把input里数据传过去也把传回来的数据填充到input里，2代表只把input里的数据传过去不对传回来的数据做操作，3代表不传input里的数据过去只把传回来的数据填入input内
  },option)

  var layerIndex;
  var stamp=parseInt(Math.random()*10000);
  var dataName="layer_hand_data"+(option.stamp?stamp:"");
  var callbackName="layer_hand_callback"+(option.stamp?stamp:"");
  var content=url+(url.indexOf("?")>-1?"&":"?")+'dataName='+dataName+'&callbackName='+callbackName;

  var handData=option.data;
  // 通过input快速传递数据的处理
  if( inputs instanceof Array && inputs.length>0 && (option.inputsAction==1 ||option.inputsAction==2)){
    handData=$.map(inputs,function(inputEl) {
      return $(inputEl).val()
    })
  }

  //弹窗弹出位置
  var win=window;
  if (option.target=='parent') {
    win=parent;
  }else if (option.target=='top') {
    win=top;
  }

  //调用后把值填进inputs所有输入框
  win[callbackName]=function(jsonStr,notClose){
    var data=jsonStr?JSON.parse(jsonStr):{};

    // 通过input快速传递数据的处理
    if( inputs instanceof Array && inputs.length>0 && (option.inputsAction==1 ||option.inputsAction==3)){
      $.each(inputs,function(i,ipt) {
        var oldVal = $(ipt).val()
        var newVal = data[i]||"";
        //值填充和触发change事件
        $(ipt).val(newVal)
        if (newVal!==oldVal) {
          $(ipt).trigger('change')
        }
      });
    }

    callback && callback(data)

    !notClose && win.layer.close(layerIndex);
  }

  //要传递的数据，会转为json字符串
  if(handData){
    win[dataName]=JSON.stringify(handData)
  }

  var end,
    end0=function() {
      focusDom.focus()
      focusDom=null
      win[callbackName]=null;
      win[dataName]=null;
      end=null;
      end0=null
    }
  if(option.end){
    end=function(){
      end0();
      option.end();
    }
  }else{
    end=end0
  }

  var focusDom=$("input:focus,textarea:focus");
  focusDom.length>0 && focusDom.blur();
  layerIndex=win.layer.open($.extend({
    type:2,
    title:title,
    closeBtn:1,
    shadeClose:true,
    area:[typeof w=="number"?(w+"px"):w,typeof h=="number"?(h+"px"):h],
    content:content
  },option,{
    end:end
  }))

  return layerIndex
} 