/*
数据监听器Observer，能够对数据对象的所有属性进行监听，如有变动可拿到最新值并通知订阅者。
利用Obeject.defineProperty()来监听属性变动，将需要observe的数据对象进行递归遍历，
包括子属性对象的属性，都加上 setter和getter，
这样的话，给这个对象的某个值赋值，就会触发setter，那么就能监听到了数据变化。
*/

function Observer(data) {
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        var self = this;
        // 取出所有属性进行遍历
        Object.keys(data).forEach(function(key){
            self.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },
    defineReactive: function(data, key, val) {
        // 创建一个消息订阅器实例，用以通知订阅者watcher
        var dep = new Dep();
        // 监听子属性
        var childObj = observeChild(val);

        // 监听属性值是否有变化
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再定义
            get: function() {
                // 由于需要在闭包内添加watcher，所以通过Dep定义一个全局target属性，暂存watcher, 添加完移除
                if (Dep.target) {
                    dep.depend();
                }
                return val;
            },
            set: function(newVal) {
                if (newVal ===val) {
                    return;
                }
                val = newVal;
                // 如果新值是object，进行监听
                childObj = observeChild(newVal);
                // 通知订阅者watcher
                dep.notify();
            }
        });
    }
}

function observeChild(value) {
    if (!value || typeof value !== 'object') {
        return;
    }
    return new Observer(value);
}

/*
消息订阅器，用来接收数据通知。
使用一个数组来收集订阅者，数据变动就触发notify方法，然后调用订阅者watcher的update方法
*/

// var uid = 0;
function Dep() {
    // this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub); // 将订阅者存入数组
    },

    depend: function() {
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        this.subs.forEach((sub)=>sub.update());
    }
}

Dep.target = null;