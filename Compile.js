/*
指令解析器Compile，对每个元素节点的指令进行扫描和解析，根据指令将模板中的变量替换成数据，然后初始化渲染页面视图，
并将每个指令对应的节点绑定更新函数，添加监听数据的订阅者watcher，一旦数据有变动，收到通知，更新视图。
*/


/*
因为遍历解析的过程有多次操作dom节点，为提高性能和效率，会先将跟节点el转换成文档碎片fragment进行解析编译操作，
解析完成，再将fragment添加回原来的真实dom节点中。
*/

function Compile(el, vm) {
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el:document.querySelector(el);
    if (this.$el) {
        this.$fragment = this.node2Fragment(this.$el);
        this.init();
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(), 
            child;
        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }
        return fragment;
    },
    init: function(){
        this.compileElement(this.$fragment);
    },
    /*
    compileElement方法将遍历所有节点及其子节点，进行扫描解析编译，
    调用对应的指令渲染函数进行数据渲染，并调用对应的指令更新函数进行绑定。
    */
    compileElement: function(el){
        var childNodes = el.childNodes,
            self = this;
        [].slice.call(childNodes).forEach(function(node) {
            var text = node.textContent;
            var reg = /\{\{(.*)\}\}/; // 表达式文本
            // 按元素节点方式编译
            if (self.isElementNode(node)) {
                self.compile(node);
            } else if (self.isTextNode(node) && reg.test(text)) {
                self.compileText(node, RegExp.$1);
            }
            // 通过递归遍历保证了每个节点及子节点都会解析编译到
            if (node.childNodes && node.childNodes.length) {
                self.compileElement(node);
            }
        });
    },

    compile: function(node) {
        var nodeAttrs = node.attributes,
            self = this;
        [].slice.call(nodeAttrs).forEach(function(attr) {
            // 规定指令以 x-xxx 命名
            var attrName = attr.name;
            if (self.isDirective(attrName)) {
                var exp = attr.value; // content
                var dir = attrName.substring(2); // text
                // 事件指令
                if (self.isEventDirective(dir)) {    
                    compileUtil.eventHandler(node, self.$vm, exp, dir);
                // 普通指令
                } else {   
                    compileUtil[dir] && compileUtil[dir](node, self.$vm, exp);
                }
                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: (attr) => {return attr.indexOf('x-') == 0},

    isEventDirective: (dir) => {return dir.indexOf('on') === 0},

    isElementNode: (node) => {return node.nodeType == 1},

    isTextNode: (node) => {return node.nodeType == 3}
};

// 指令处理集合
var compileUtil = {
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var self = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            self._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },
    bind: function(node, vm, exp, dir) {
        var updaterFn = updater[dir + 'Updater'];
        // 第一次初始化视图
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));
        // 实例化订阅者，此操作会在对应的属性消息订阅器中添加了该订阅者watcher
        new Watcher(vm, exp, function(value, oldValue) {
            // 一旦属性值有变化，会收到通知执行这里更新函数和视图
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];
        
        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach((k, i) => {
            // 非最后一个key，更新val值
            i < exp.length-1 ? val = val[k] : val[k] = value;
        });
    }
};

var updater = {
    textUpdater: (node, value) => {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: (node, value) => {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');
        var space = className && String(value) ? ' ' : '';
        node.className = className + space + value;
    },

    modelUpdater: (node, value, oldValue) => {
        node.value = typeof value == 'undefined' ? '' : value;
    }
}