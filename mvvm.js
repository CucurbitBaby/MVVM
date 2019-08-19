//
class Compiler {
    constructor(el,vm) {
        // 判断el属性 是不是一个DOM元素节点,0不是就获取他  (拿到当前模板)
        this.el = this.isElementNode(el) ? el : document.querySelector(el);

        //把当前节点中的元素 获取到 放到内存中
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

        // console.log(...attributes)      //  tyep="text" v-model="school.name"

        [...attributes].forEach(attr=>{
            let { name,value:expr } = attr;          //  v-model="school.name"
            // console.log('name=====',name)
            // console.log('value=====',value)
            // 判断是否指令
            if(this.isDirective(name)){         // v-model v-html v-bind
                // console.log(node,'element')
                let [,directive] = name.split('-')
                // 需要调用不同的指令来处理
                CompileUtil[directive](node,expr,this.vm);   // expr: shcool.name
            }

        })

        // console.log(attributes)
        // console.log('---------------------')
    }

    // 编译文本的方法
    compileText(node){
        let content = node.textContent;   // 依旧是伪数组
        // console.log(content)
        // console.log('---------------------')
        if(/\{\{(.+?)\}\}/.test(content)){
            // console.log(content)       // 找到所有文本
            // 文本节点
            CompileUtil['text'](node,content,this.vm);      // content可能 {{aaa}} {{bbb}}..都要替换

        }

    }

    // 核心编译方法   用来编译内存中的DOM节点
    compile(node) {
        let childNodes = node.childNodes;       // NodeList(9)[..] 伪数组
        // console.log(childNodes)
        // console.log(...childNodes)           // ES6展开操作符 ...
        [...childNodes].forEach(child=>{    // 为什么放再try外面会报错呢？不能和console.log(childNodes同时存在)
            if(this.isElementNode(child)) {
                // console.log('element',child)
                this.compileEment(child)
                // 如果是元素的话，需要把自己传入递归     全遍历
                this.compile(child)
            }
            else {
                // console.log('text',child)
                this.compileText(child)
            }
        })


        // for(var i=0; i<childNodes.length;i++){       // 这样也不报错
        //     console.log(childNodes[i])
        // }
        // try{
        //     [...childNodes].forEach(child=>{    // 为什么放再try外面会报错呢？
        //         console.log(child)
        //     })
        // }
        // catch(e){
        //     console.log('出错了')
        //
        // }
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
    model(node,expr,vm) {   // node是节点， expr是表达式， vm是当前实例
        // shcool.name去vm.$data里面寻找
        // 给输入框赋予value属性    node.value = xxx
        // 错误：vm[expr] = vm.$data['shcool.name']   正确:需要一层一层取 getVal()

        let fn = this.updater['modelUpdater']       // 拿到工具u对象的modelUpdater()方法
        let value = this.getVal(vm,expr)    // 珠峰
        // 拿到value之后去 modelUpdater()【fn】 更新
        fn(node,value)

    },
    html() {
        // node.innerHTML = xxx

    },
    text(node,expr,vm) {    // expr => {{aaa}} {{bbb}}...
        let fn = this.updater['textUpdater']
        let content = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{
            return this.getVal(vm,args[1]);
        })

        fn(node,content)
    },
    updater:{
        // 把数据插入到节点中
        modelUpdater(node,value) {
            node.value = value;
        },
        htmlUpdater() {

        },
        // 处理文本节点
        textUpdater(node,value) {
            node.textContent = value;
        },
    }

}



// 基类: 调度
class Vue {
    constructor(options){
        // this.$el $data $options
        this.$el = options.el;
        this.$data = options.data;
        // 这个根元素 存在 ? 编译模板
        if(this.$el){
            new Compiler(this.$el,this);
        }
    }
}


