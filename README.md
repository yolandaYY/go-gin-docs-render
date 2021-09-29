- $GOPATH/src/[go.mod module 声明项目路径（通常流行用顶级域名或github名区分）] 项目代码存放地址
- 通过 module 组合模块(排除vendor文件夹)
- package 同一目录同级为一个包，包名可以和目录不同名，main包、函数是必有的
- 首字母大写才可以被另一个包引用，否则只能在包内引用



- var出现在字符串里面会出错
- var\s*\(([^)]+)\)    假设 类型不存在() var (...)
- var\s*(\S+)\s*(\S+)\s*=\s*(\S+)   var name type = value
- var\s*(\S+)\s*(\S+)  var name type TODO
- var([^=\n;]+)=([^\n;]+)   var name = value
- [\n;](.+)\s*:=\s*([^\n;]+)       name := value 可能匹配到if语句

- var出现在字符串里面会出错
- var


- \b(?=[^:;]+:=)(\S+(?:\s*,\s*\S+)*)\s*:=\s*([^\n;]+)


- 暂时不加作用域
- 不支持 类型定义和类型别名