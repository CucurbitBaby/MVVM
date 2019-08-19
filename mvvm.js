class Dep {
    constructor(){
        this.subs = [];            // 存放所有的 watcher 观察者
    }
    // 订阅
    addSub(watcher){               // 添加 watcher 观察者
        this.subs.push(watcher)
    }
    // 发布
    notify(){                      //  让每一个 watcher 观察者 的 update()  去执行Vnode里面的数据
        this.subs.forEach((watcher)=>watcher.update());
    }
}



// 观察者模式 (包含发布订阅模式)      观察者  被观察者
class Watcher{  // 创建 观察者类
    constructor(vm,expr,cb){
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        // 默认选存一下老值   有当前的vm实例 有表达式expr 直接拿
        this.oldValue = this.get()

    }
    get(){
        Dep.target = this;
        // 直接复用之前的工具对象 CompileUtil.get()方法
        let value = CompileUtil.getVal(this.vm,this.expr)
        Dep.target = null;      // 不取消 任何值取值 都会添加 watcher
        return value;
    }

    update(){       // 更新操作 数据变化后 会调用观察者的update方法
        let newVal = CompileUtil.getVal(this.vm,this.expr)
        if(newVal !== this.oldValue){
            this.cb(newVal)             // 这个callback就是new Watcher时传入的cb 用来更新
        }
    }
}

// new一个Watcher观察者的时候 需要拿 老值oldValue 和 新值newValue 对比一下  有变化 才执行callback
// vm.$watch(vm,'shcool.name',(newVal)=>{
//     ...  数据一改变 执行 callback
// })



class Observer {        // 实现数据劫持功能
    constructor(data){
        this.observer(data)
    }
    observer(data){
        // 对象才观察
        if(data && typeof data == 'object'){

            for(let key in data){
                this.defineReactive(data,key,data[key]);
            }
        }
    }
    defineReactive(obj,key,value){
        // 形成递归
        this.observer(value)
        let dep = new Dep()         // 给每个属性添加发布订阅功能
        Object.defineProperty(obj,key,{
            get(){
                // 创建watcher时候 会取到对应的内容 并且 把 watcher放到了全局上
                Dep.target && dep.addSub(Dep.target);
                return value;
            },
            set: (newVal)=>{

                if(newVal != value){
                    this.observer(newVal)       // 直接vm.$data.school = {a:1}  也能设置get set存储描述符  劫持
                    value = newVal
                    dep.notify();
                }
            }

        })
    }

}

// 编译模板
class Compiler {
    constructor(el, vm) {
        // 判断el属性 是不是一个DOM元素节点,0不是就获取他  (拿到当前模板)
        this.el = this.isElementNode(el) ? el : document.querySelector(el);

        this.vm = vm;
        let fragment = this.node2fragment(this.el);
        // console.log(fragment)

        // 把节点中的内容进行替换

        // 编译模板 用数据编译
        this.compile(fragment);

        // 把内容塞到页面中
        this.el.appendChild(fragment)
    }

    isDirective(attrName) {
        return attrName.startsWith('v-');   // 判断是否指令
    }

    // 编译元素的方法
    compileEment(node){
        let attributes = node.attributes;   // 依旧是伪数组
        [...attributes].forEach(attr=>{
            let { name,value:expr } = attr;          //  v-model="school.name"
            // 判断是否指令
            if(this.isDirective(name)){         // v-model v-html v-bind
                let [,directive] = name.split('-')      // 有可能是 v-on ...
                // console.log(directive)       // model
                let [directiveName,eventName] = directive.split(':')


                // 需要调用不同的指令来处理
                CompileUtil[directiveName](node,expr,this.vm,eventName);   // expr: shcool.name
            }
        })
    }

    // 编译文本的方法
    compileText(node){
        let content = node.textContent;         // 依旧是伪数组
        if(/\{\{(.+?)\}\}/.test(content)){      // 此时compile遍历调用 compileText  如果符合test 拿到的node就是我想要的
            // console.log(content)       // {{school.name}} {{school.name}} {{school.age}}
            CompileUtil['text'](node,content,this.vm);      // content可能 {{aaa}} {{bbb}}..都要替换
        }
    }

    // 核心编译方法   用来编译内存中的DOM节点
    compile(node) {
        let childNodes = node.childNodes;       // NodeList(9)[..] 伪数组

        [...childNodes].forEach(child=>{
            if(this.isElementNode(child)) {
                this.compileEment(child)
                // 如果是元素的话，需要把自己传入递归     全遍历
                this.compile(child)
            }
            else {
                this.compileText(child)
            }
        })

    }

    // 把节点移动到内存中
    node2fragment(node) {
        // 创建一个文档碎片
        let fragment = document.createDocumentFragment();
        let firstChild;
        while (firstChild = node.firstChild) {
            // console.log(firstChild)     // 9
            // appendChild具有移动性
            fragment.appendChild(firstChild);
        }
        return fragment
    }

    // 判断是否DOM元素节点
    isElementNode(node) {
        return node.nodeType === 1;
    }
}

// 编译工具
CompileUtil = {
    // 根据表达式获取对应的数据
    getVal(vm,expr) {   // vm.$data   'shcool.name'

        return expr.split('.').reduce((data,current)=>{     // reduce: 减少 多对1  args(tmp,item,index)
            return data[current]
        },vm.$data)

    },
    setValue(vm,expr,value){        // vm.$data选取school再取name 在赋值   school.name = '张国'
         expr.split('.').reduce((data,current,index,arr)=>{     // reduce: 减少 多对1  args(tmp,item,index)
            if(arr.length-1 == index){
                return data[current] = value
            }
            return data[current]
        },vm.$data)
    },

    // 解析v-model的指令
    model(node,expr,vm) {
        // node是节点， expr是表达式， vm是当前实例
        // shcool.name去vm.$data里面寻找
        // 给输入框赋予value属性    node.value = xxx
        // 错误：vm[expr] = vm.$data['shcool.name']          // 正确:需要一层一层取 getVal()

        let fn = this.updater['modelUpdater']               // 拿到工具u对象的modelUpdater()方法
        // new Watcher(vm,expr,(newVal)=>{                  // 给输入框加一个观察者 如果稍后数据更新了
        //     // 触发此方法 拿新值 赋给输入框
        //     fn(node,newVal)
        // })
        new Watcher(vm,expr,(newVal)=>{                 // 给input或者用到v-model的标签 添加一个观察者
            fn(node,newVal);                                // 稍后数据更新了，会触发这个callback回调函数
                                                            // callback拿到新值给input赋值
        })

        node.addEventListener('input',(e)=>{
            let value = e.target.value;
            this.setValue(vm,expr,value);
        })

        let value = this.getVal(vm,expr)    // 珠峰
        // 拿到value之后去 modelUpdater()【fn】 更新
        fn(node,value)

    },
    html(node,expr,vm) {         // v-html="message"                 node.innerHTML = xxx
        let fn = this.updater['htmlUpdater']

        new Watcher(vm,expr,(newVal)=>{
            fn(node,newVal);
        })


        let value = this.getVal(vm,expr)
        // 拿到value之后去 modelUpdater()【fn】 更新
        fn(node,value)
    },
    getContentValue(vm,expr){
        // 遍历表达式 将内容 从新替换成一个完整的内容 返回
        return expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{
            return this.getVal(vm,args[1])
        })
    },
    on(node,expr,vm,eventName){     // v-on:click="change"  "change"

        node.addEventListener(eventName,(e)=>{
            vm[expr].call(vm,e);    // this.change?
        })

    },
    text(node,expr,vm) {    // expr => {{aaa}} {{bbb}}... 还是个伪数组
        let fn = this.updater['textUpdater']

        let content = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{
            // console.log(...args)  // {{school.name}} school.name 5 {{school.name}}
            // 给表达式每个{{}} 都加上观察者
            // new Watcher(vm,args[1],(newVal)=>{
            //     let quanzhi = this.getContentValue(vm,expr);      //  返回了一个全的字符串
            //     fn(node,quanzhi)
            // })
            new Watcher(vm,args[1],(newVal)=>{      // 给表达式每个大括号{{xxx}} 都加上观察者  {{aaa}}{{bbb}}...这种情况上面的compile传递过来的是遍历节点传递 的是 文本节点
                fn(node,this.getContentValue(vm,expr))         // 返回一个 全字符串
            })
            return this.getVal(vm,args[1]);
        })

        fn(node,content)
    },
    updater:{
        // 把数据插入到节点中
        modelUpdater(node,value) {
            node.value = value;
        },
        // 处理文本节点
        textUpdater(node,value) {
            node.textContent = value;
        },
        htmlUpdater(node,value) {
            node.innerHTML = value;
        }
    }

}

// 基类: 调度
class Vue {
    constructor(options){
        // this.$el $data $options
        this.$el = options.el;
        this.$data = options.data;
        let computed = options.computed;
        let mothods = options.methods;
        // 这个根元素 存在 ? 编译模板
        if(this.$el){

            // 编译之前 把数据 全部转化成用Object.defineProperty来定义的数据
            new Observer(this.$data)


            // {{getNewName}}  reduce vm.$data.getNewName
            for(let key in computed){
                Object.defineProperty(this.$data,key, {
                    get:()=>{
                        return computed[key].call(this)
                    }
                })
            }

            for(let key in mothods){
                Object.defineProperty(this,key,{
                    get(){
                        return mothods[key]
                    }
                })
            }

            // 把数据获取操作 vm上的取值操作 都代理到 vm.$data
            this.proxyVm(this.$data);


            new Compiler(this.$el,this);
        }
    }
    proxyVm(data){
        for(let key in data) {
            Object.defineProperty(this,key,{
                get(){
                    return data[key];
                },
                set(newVal){
                    data[key] = newVal;
                }
            })
        }
    }
}
