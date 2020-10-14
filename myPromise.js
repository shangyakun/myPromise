/**
    1.创建 mypromise ，回调函数需要立即执行，所以传入executor执行器立即执行
    2.改变状态，由于promise对象状态一景改变就不会再进行转态变更，所以需要判断状态
    3.
**/

//定义peomise状态
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
class MyPromise {
    //传入执行器，立即调用
    constructor(executor){
        //接收两个回调函数resolve reject,在调用resolve和reject时
        //并没有this.___所以需要传入this.resolve和this.reject
        try{
           //添加try、catch捕获异常
            executor(this.resolve,this.reject);
        } catch (e){
            this.reject(e);
        }
    }
    //初始状态
    status = PENDING
    //成功值
    resValue = undefined
    // 失败值
    errValue = undefined
    //将异步情况发生时的成功和失败回调存入属性
    //由于可能出现多次异步调用所以将所有的回调存到数组里
    successCallBack = []
    failedCallBack = []
    //resolve和reject两个函数写成尖头函数是因为考虑到this指向问题， 箭头函数捕获上下文this对象，始终在class类中
    resolve = res => {   
        if(this.status===PENDING){//修改promise对象的状态，一经改变就不会被再次改变
            this.status = FULFILLED;
            this.resValue = res;
            while (this.successCallBack.length) {
                this.successCallBack.shift()(res)
            };
        };
    }
    reject = err => {
        if(this.status===PENDING){//修改promise对象的状态，一经改变就不会被再次改变
            this.status = REJECTED;
            this.errValue = err;
            while (this.failedCallBack.length){
                this.failedCallBack.shift()(err)
            };
        };
    }
    //then接收两个回调函数，失败和成功回调
    then (successCallBack,failedCallBack){
        //then的回调是可选的，所以添加此功能
        successCallBack = successCallBack ? successCallBack : value => value;
        failedCallBack = failedCallBack ? failedCallBack : err => { throw err };
        /**
            实现链式调用
            因为链式调用使用的是then方法，说明每个then方法的返回值应该是一个MyPromise对象，由于可能将每个then的返回值给到下一个then中去
            所以单单返回MyPromise对象还是不够的，由于then的回调函数的值是通过resolve或者reject函数传递来的，所以返回的值应该是一个包含有
            resolve方法的promise对象；  
        **/
        let promise = new MyPromise( (resolve,reject) => {
            //因为MyPromise参入的参数是立即执行的
             if(this.status===FULFILLED){
                // 调用成功回调函数，传入resolve接收的参数
                //then中回调函数的return的值就是succssCallBack函数的，所以将成功回调的值给到resolve；
                //这样就是一个新的包含resolve方法的MyPromise值，可以调用then了

                setTimeout(()=>{//使用定时器为了拿到刚声明的promise，让这部分代码块成为异步的，就可以获取到同步代码中的变量了
                    try{
                        let val = successCallBack(this.resValue);
                        //接下来判断x值的类型，是普通值还是promise对象
                        //如果是普通值就直接返回调用reslove；
                        //如果是promise对象，出发resolve或者reject
                        //定义新的函数做一个判断的封装1.判断是否自己，2.判断值类型，3。传入成功和失败回调
                        parsePromise(promise,val,resolve,reject);
                        //上边的方法相当于调用return 的promise的then方法判断是成功还是失败，然后调用resolve或者reject
                        //相当于如下例子
                        // new MyPromise((res,rej)={
                        //     res('1298798')
                        // })//这里的MyPromise是你返回的对象
                        //在这里调用一下判断这个对象的状态，成功的话调用父级的resolve
                        // .then(res=>{
                        //     resolve(res);//这里调用的是父级的resolve
                        // })
                    } catch (e) {
                        reject(e)
                    }
                },0)
            }else if(this.status===REJECTED){
                // 调用失败回调函数，传入reject接收的参数
                setTimeout(()=>{//使用定时器为了拿到刚声明的promise，让这部分代码块成为异步的，就可以获取到同步代码中的变量了
                    try{
                        let val = failedCallBack(this.errValue);
                        //接下来判断x值的类型，是普通值还是promise对象
                        //如果是普通值就直接返回调用reslove；
                        //如果是promise对象，出发resolve或者reject
                        //定义新的函数做一个判断的封装
                        parsePromise(promise,val,resolve,reject);
                    } catch (e) {
                        reject(e)
                    }
                },0)
            }else{
                //1.处理异步问题
                //2.处理多个异步调用问题
                //为了捕获异常，成功和失败
                this.successCallBack.push(successCallBack);
                this.failedCallBack.push(failedCallBack);
            }
        });
        return promise;
    } 
    static all(array){
        let result = [];
        let i = 0;
        //all接下来是then方法所以会返回MyPromise对象
        return new MyPromise((resolve,reject)=>{
            function getAllResolve(i,current){
                // 判断参数下标再给到新数组相对映下标的值，期间判断是普通值还是promise对象，是promise对象的话就把值拿到放到新数组
                if(current instanceof MyPromise){
                    current.then(value => {
                        getAllResolve(i,value)
                    },err => reject(err));
                }else{
                    result[i] = current;
                };
                //判断新数组的值是否和参数的长度一致，一致说明完成作业
                if(i===result.length){
                    return resolve(result);
                }
                i++;
            };
            //循环参数值
            for (let i = 0; i < array.length; i++) {
                let current = array[i];
                getAllResolve(i,current);
            };
        })
        
    }
    finally(callback){
        //then可以访问到MyPromis实例里的resolve参数继而可以进行链式调用
        return this.then( value => {
            // callback();
            // resolve(value)
            //借助于MyPromise对象下的resolve静态方法，去转换callback的值，可能是一个静态之或者是一个promise对象或者是一个普通函数
                                     //⬇这里的代码就是调用callback，resolve中可以进行判断如果是promise转换成返回新的promise对象等待调用
                                     //⬇否则就转换为promise对象进行调用,之后再返回原promise对象resolve中的参数
                                     //好难，有点绕
            return MyPromise.resolve(callback()).then( () => value )
        },err => {
            return MyPromise.resolve(callback()).then( () => { throw err } )
        })
    }
    static resolve(arg){
        if(arg instanceof MyPromise){
            return arg    
        };
        return new MyPromise((resolve,reject) => resolve(arg)) 
    }
    //失败回调catch方法
    catch(failedCallBack){
        return this.then(undefined,failedCallBack)
    }
};
//通过此函数判断值得类型并调用相应的方法
function parsePromise (promise,val,resolve,reject) {
    // 添加判读条件阻止自己返回自己，会导致循环调用
    if(promise === val){
        return reject(new TypeError('Uncaught (in promise) TypeError: Chaining cycle detected for promise #<Promise>'))
    }
    //instanceof判断是promise对象
    if(val instanceof MyPromise){
        //执行promise
        //val是promise对象，通过调用then方法将值再返回出去
        //val.then()是查看返回的这个promise对象的状态，如果是resolve就调用要返回的promise对象的then方法，resolve是从传递进来的所以在then的
        //成功回调中调用传递进来的resolve方法,就可以在接下来的then链式调用之中使用resolve()传来的值了，
        //感觉这一块有点绕，写成val.then(value => resolve(value),err => reject(err))容易理解
        val.then(resolve,reject)
    }else{
        resolve(val)
    }
};














