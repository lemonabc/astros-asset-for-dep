'use strict';

// let [nodeUrl, nodePath, nodeFs] = {}
var nodeUrl = require('url');
var nodePath = require('path');
var nodeFs = require('fs');
var util = require('lang-utils');

var nodeUtil = require('util');

module.exports = new astro.Middleware({
    modType: 'merge',
    fileType: ['js']
}, function(asset, next) {
    //let depFile = nodePath.join(asset.prjCfg.root, 'config', 'dependon');
    //let dep = require(depFile).combine;
    //通过上级解析获取依赖关系表
    let dep = asset.dep.combine;
    let project = asset.project;
    //循环查找资源，资源引用方式为一下2种
    //1.名称内不含‘:’，路径为assets/jslib目录下
    //2.名称含':'为根据:分割com为components组件下，assets为assets目录下，page为页面js
    //
    var jsLibs = [];
    var com = [];
    var page = [];
    if(dep[asset._name]){
        for(var i=0;i<dep[asset._name].length;i++){
            if(dep[asset._name][i].search(':')<0){
                jsLibs.push(dep[asset._name][i]);
            }else{

                if(dep[asset._name][i].search('com')>=0){
                    com.push(dep[asset._name][i].split(":")[1]);
                }else if(dep[asset._name][i].search('page')>=0){
                    page.push(dep[asset._name][i].split(":")[1]);
                }else if(dep[asset._name][i].search('assets')>=0){

                }
            }
        }
    }
    
    com = com.map(function(wc) {
        return new astro.Asset({
            ancestor: asset,
            project: project,
            modType: 'webCom',
            name: wc,
            fileType: 'js'
        });
    })
    let reader = astro.Asset.getContents(com||[]);
    reader.then(function(assets) {
        let webComCode = '';
        var wcError = '';
        assets.forEach(function(ast) {
            if (!ast.data)
                wcError += ['/* webCom:' + ast.filePath + ' is miss */', ''].join('\n');
            else {
                webComCode += '/* ' + ast.filePath + ' */\n' + ast.data + '\n';
            }
        });
        asset.data = webComCode + (asset.data || '');
        //加载jslib
        jsLibs = jsLibs.map(function(js) {
            return new astro.Asset({
                ancestor: asset,
                modType: 'jsCom',
                fileType: 'js',
                name: js,
                project: project
            });
        });

        return astro.Asset.getContents(jsLibs);

    }).then(function(assets){
        
        let reader = astro.Asset.getContents(jsLibs);
        let jsLibCode = '',
            wcError = '',
            errorMsg = '';
        try{
            assets.forEach(function(at) {
                if (at.data) {
                    jsLibCode += ['', '/* ' + at.filePath + ' */', at.data, ''].join('\n');
                    return;
                }

                errorMsg += nodeUtil.format('\n/* jsLib(%s) is miss, project:%s */', asset.info, project);
            });

            jsLibCode = ' /* jsCom:' + jsLibs.join(',') + ' */ \n' + jsLibCode + '\n';
            asset.data = [wcError, errorMsg, jsLibCode, '/* ' + asset.filePath + ' */', asset.data||''].join('\n');
        }catch(e){
            console.error('astro-js-proces\n',e.stack);
        }



    }).then(function(){
        page.map(function(js) {
            var pageJs = new astro.Asset({
                ancestor: asset,
                modType: 'page',
                fileType: 'js',
                name: js,
                project: project
            }).read();
            asset.data = asset.data + pageJs + '\n';
        });
        
    }).then(function(){
        next(asset);
    })



});

// module.exports = aa;
