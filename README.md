# checktree
``` bash
基于jquery和ztree封装实现的一个功能完善而强大的树形选框组件。
```
[demo]( https://zhangzicao.github.io/checktree)

## 介绍
ztree是一个强大的树形组件，想必大部分人用过，或者听过。ztree虽功能强大，但是需要开发者熟悉插件的api并作出想要的配置，这里我封装了多种常用功能/选折方式，支持多样化的需求，并支持自定义皮肤。

## 初始化
``` javascript
zTreeObj = $('.checktree').checkTree(data,{
    limit:limit
    ,checkedData:ids
    ,skin:"large"
  });
```

## 文档
[demo/文档]( https://zhangzicao.github.io/checktree)

## 返回
> {object} ztreeObject对象

## 依赖
> jquery、ztree


## 目录
下面主要介绍几个重要的目录

``` bash
|-dist  代码发布目录
|-doc  文档和demo所在文件夹
```