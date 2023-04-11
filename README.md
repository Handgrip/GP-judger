长时运行，简化输入输出

流程：
1. 编译 judger 和所有 gamer
2. 运行 judger，获取 command
3. 运行 gamer
4. 运行 judger，直至 command=finish
5. 返回 summary

## client
ts 业务逻辑、拉取任务、返回 display（部分返回、最终结果返回）
输入
```json
{
    "code":{
        "judger":{
            "language":"",
            "source":"",
            "limit":{
                "time":0,
                "memory":0
            }
        },
        "0":{
        },
        "1":{
        }
    }
}
```

输出
```json
{
    "complie":{
        "judger":{
            "time":{
                "usr":0,
                "sys":0,
                "real":0
            },
            "memory":0,
            "message":"",
            "verdict": "OK"
        },
        "0":{

        }
    },
    "round":[
        {
            "output":{
                "command": "request",
                "content": {
                    "0": "",
                    "1": ""
                },
                "display": "",
            },
            "time":{
                "usr":0,
                "sys":0,
                "real":0
            },
            "memory":0,
            "verdict": "OK"
        },
        {
            "1": {
                "memory": 0,
                "time":{
                    "usr":0,
                    "sys":0,
                    "real":0
                },
                "verdict": "OK",
                "raw": "1 6"
            }
        }
    ]
}
```

## manager
与 judger、gamer 通信，转发消息、返回 display、限制占用

流程：
1. 运行 judger、gamer
2. 获取 judger 输出、usage
3. 解析 judger 输出
4. 传入 gamer
5. 获取 gamer 输出、usage
6. 。。。
7. 收到 finish
8. kill everyone


获取 usage？
与 heng-core 通信。


## judger
输入
```json
{
    "0": {
        "raw": "",
        "verdict": "OK"
    },
    "1": {
    }
}
```

输出
```json
{
    "command": "request",
    "content": {
        "0": "",
        "1": ""
    },
    "display": ""
}
```
```json
{
    "command": "finish",
    "content": {
        "0": 1,
        "1": -1
    },
    "display": ""
}
```

## gamer 

简化输入输出

输入
```
单行或多行，由 judger 提供
```

输出
```
务必一行？EOF？
```
