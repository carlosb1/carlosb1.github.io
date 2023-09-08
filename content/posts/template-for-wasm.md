+++
title = "Template for WASM with a WebWorker"
date = "2023-09-01"
+++

One of the main rust ecosystem is the webassembly technology. `wasm-bindgen` and `wasm-pack` eases a lot the development process and includes a good set of libraries to work with different concepts (`webgl`, `websys`, `websockets`, `web workers` for example)... Here we can check a easy example about how to implement a web worker, it is incredible easy:

In the Rust side, we have this:

```Rust
#[wasm_bindgen(start)]
pub fn init() -> Result<(), JsValue> {
    wasm_logger::init(wasm_logger::Config::default());
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    Ok(())
}

#[wasm_bindgen]
pub fn run() -> Result<(), JsValue> {
    log::info!("Starting main function");
    let worker = web_sys::Worker::new("./worker.js").unwrap();
    let onmessage = get_on_msg_callback();
    // my callback from the worker
    worker.set_onmessage(Some(onmessage.as_ref().unchecked_ref()));
    //send message to worker
    worker
        .post_message(&JsValue::from(1.0))
        .expect("failed to post");
    std::mem::forget(onmessage);
    Ok(())
}
```
 We define two functions, the first one with `#[wasm_bindgen(start)]` marks the function as the initialization function that it is called in the loading step. `run` is tagged with `#[wasm_bindgen]` that it exposes the function outside the rust code. If you check `run`, the `set_onmessage` accepts a closure function as a callback from Javascript. Furthemore, from `post_message`, we can send messages to the Web Worker in the Javascript side.


From the javascript Web Worker we can trigger message in Rust. Here the Rust code:

```Rust
#[wasm_bindgen]
pub struct MyWorker {}

#[wasm_bindgen]
impl MyWorker {
    pub fn new() -> MyWorker {
        MyWorker {}
    }

    pub fn hello_world(&mut self, name: String) -> String {
        wasm_logger::init(wasm_logger::Config::default());
        log::info!("Hello world my friend {:?}", name);
        return "Hello world response".to_string();
    }
}

///// Create a closure to act on the message returned by the worker
fn get_on_msg_callback() -> Closure<dyn FnMut(MessageEvent)> {
    Closure::new(move |event: MessageEvent| {
        log::info!("Received response: {:?}", &event.data());
    })
}
```
You can check, how we created a worker function with name `hello_world` that it can be called from javascript.

For the Javascript part, we have the `index.html` and the `worker.js`:

```html
<!DOCTYPE html>
<html>

<head>
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type"/>
    <style>
        body {
            margin: 0px;
            padding: 0px;
        }
        canvas#my_canvas {
			position: absolute;
            width: 100%;
            height: 100%;
        }
    </style>
</head>

<body>

<div style="max-height: 256px;max-width:256px;overflow: scroll;">
    <canvas id="my_canvas"></canvas>
</div>

<script src="pkg/my_webgl_app.js"></script>

<script>
    const {main} = wasm_bindgen;
    async function run() {
            await wasm_bindgen();
            main();
    }
    run();
</script>

</body>
</html>
```
```javascript
// worker.js
importScripts("./pkg/my_webgl_app.js"); //generated wasm code, the name depends on project

console.log("Initializing worker");

// In the worker, we have a different struct that we want to use as in
// `index.js`.

async function init_wasm_in_worker() {
  self.onmessage = async (event) => {
    await wasm_bindgen("./pkg/my_webgl_app_bg.wasm");
    const { MyWorker } = wasm_bindgen;
    var my_worker = MyWorker.new();

    var hello = my_worker.hello_world("john");

    console.log("please ");
    console.log(hello);

    // Send response back to be handled by callback in main thread.

    setInterval(() => {
      //postMessage();
      self.postMessage("returns message");
    }, 500);
  };
}

init_wasm_in_worker();
```
