# go-gin-docs-render
对 go-gin 项目进行解析，输出 json、markdown 两种格式的接口文档

## 使用方式
`node ./index.js`  

## 限制
- 必须使用 go-gin 框架
- 必须使用 go.mod 文件进行包管理
- 暂不解析 make() 创建的对象
- 暂不支持类型别名


# 输出示例
对 https://github.com/eddycjy/go-gin-example 项目进行解析的部分输出如下

## markdown 文件

***端口 8080***

**GET /api/v1/articles/:id**
### 请求
- path参数

    - id

### 响应

  - **状态码** ***200***
  - **JSON**  
      
```
{
    code: 200,              // [int]    
    msg: e.GetMsg(errCode), // [string]    
    data: {
      id:                        //  [int] gorm:primary_key 
      created_on:                //  [int] 
      modified_on:               //  [int] 
      deleted_on:                //  [int] 
      tag_id:                    //  [int]  gorm:index
      tag: {
            id:                        //  [int] gorm:primary_key 
            created_on:                //  [int] 
            modified_on:               //  [int] 
            deleted_on:                //  [int] 
            name:                      //  [string] 
            created_by:                //  [string] 
            modified_by:               //  [string] 
            state:                     //  [int] 
      }
      title:                     //  [string] 
      desc:                      //  [string] 
      content:                   //  [string] 
      cover_image_url:           //  [string] 
      created_by:                //  [string] 
      modified_by:               //  [string] 
      state:                     //  [int] 
    },  

}
```  

</details>

## json 文件

``` jsonc
[
  {
    "port": 8080    // 服务器端口
  },
  {
    "url": "/api/v1/articles/:id", 
    "method": "GET",
    "handleState": {      
      "Param": [                    // gin 方法
        [                           
          {
            "name": "id"            // 参数变量名
          }
        ]
      ],   
      "JSON": [                    // gin 方法
        [
          {
            "name": "http.StatusOK" // 参数变量名
          },
          [                         // 结构体
            {
              "name": "Code",        // 属性名
              "jsonKey": "code",     // 映射的json属性名
              "value": "200",        // 值
              "type": "int",         // 类型
              "comment": ""          // 结构体标签
            },
            {
              "name": "Msg",
              "jsonKey": "msg",
              "value": "e.GetMsg(errCode)",
              "type": "string",
              "comment": ""
            },
            {
              "name": "Data",
              "jsonKey": "data",
              "value": {
                "ID": {
                  "type": "int",
                  "comment": "gorm:primary_key ", // 结构体标签
                  "jsonKey": "id"
                },
                "CreatedOn": {
                  "type": "int",
                  "comment": "",
                  "jsonKey": "created_on"
                },
                "ModifiedOn": {
                  "type": "int",
                  "comment": "",
                  "jsonKey": "modified_on"
                },
                "DeletedOn": {
                  "type": "int",
                  "comment": "",
                  "jsonKey": "deleted_on"
                },
                "TagID": {
                  "type": "int",
                  "comment": " gorm:index",
                  "jsonKey": "tag_id"
                },
                "Tag": {
                  "type": "Tag",
                  "comment": "",
                  "jsonKey": "tag",
                  "value": {
                    "ID": {
                      "type": "int",
                      "comment": "gorm:primary_key ",
                      "jsonKey": "id"
                    },
                    "CreatedOn": {
                      "type": "int",
                      "comment": "",
                      "jsonKey": "created_on"
                    },
                    "ModifiedOn": {
                      "type": "int",
                      "comment": "",
                      "jsonKey": "modified_on"
                    },
                    "DeletedOn": {
                      "type": "int",
                      "comment": "",
                      "jsonKey": "deleted_on"
                    },
                    "Name": {
                      "type": "string",
                      "comment": "",
                      "jsonKey": "name"
                    },
                    "CreatedBy": {
                      "type": "string",
                      "comment": "",
                      "jsonKey": "created_by"
                    },
                    "ModifiedBy": {
                      "type": "string",
                      "comment": "",
                      "jsonKey": "modified_by"
                    },
                    "State": {
                      "type": "int",
                      "comment": "",
                      "jsonKey": "state"
                    }
                  }
                },
                "Title": {
                  "type": "string",
                  "comment": "",
                  "jsonKey": "title"
                },
                "Desc": {
                  "type": "string",
                  "comment": "",
                  "jsonKey": "desc"
                },
                "Content": {
                  "type": "string",
                  "comment": "",
                  "jsonKey": "content"
                },
                "CoverImageUrl": {
                  "type": "string",
                  "comment": "",
                  "jsonKey": "cover_image_url"
                },
                "CreatedBy": {
                  "type": "string",
                  "comment": "",
                  "jsonKey": "created_by"
                },
                "ModifiedBy": {
                  "type": "string",
                  "comment": "",
                  "jsonKey": "modified_by"
                },
                "State": {
                  "type": "int",
                  "comment": "",
                  "jsonKey": "state"
                }
              },
              "type": "interface{}",
              "comment": ""
            }
          ]
        ]
      ]
    }
  }
]
```



