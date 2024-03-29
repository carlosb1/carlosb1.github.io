+++
title = "Distributed systems concepts (Part 1)"
date = "2023-09-26"
+++

Learning about Distributed systems and their usual patterns. I started to learn patterns from the Uncle Bob [web](https://martinfowler.com/articles/patterns-of-distributed-systems). I started checking the [Lamport clock](https://martinfowler.com/articles/patterns-of-distributed-systems/lamport-clock.html).

Furthermore, It is a good opportunity to use [message-io](https://github.com/lemunozm/message-io) library which easier a lot the network protocols. In fact, It simplifies the creation of a client-server communication and its protocol with these files:


```Rust
//net.rs
use message_io::network::{NetEvent, Transport};
use message_io::node::{self, NodeEvent};

use crate::adapters::network::message::{FromClientMessage, FromServerMessage, Signal};
use crate::entity::Node;

use std::sync::Arc;
use std::sync::Mutex;

pub trait ServerDispatcher {
    fn dispatch(&mut self, received: FromClientMessage) -> Option<FromServerMessage>;
}
pub trait ClientDispatcher {
    fn dispatch(&mut self, received: FromServerMessage) -> Option<FromClientMessage>;
}

/// Network function for setting up a message-io server.
pub fn run_server<T: ServerDispatcher + Clone>(node: Node, dispatcher: Arc<Mutex<T>>) {
    log::info!("Running server for address {:}", node.address);
    let (handler, listener) = node::split::<()>();
    handler
        .network()
        .listen(Transport::FramedTcp, node.address)
        .unwrap();

    listener.for_each(move |event| match event.network() {
        NetEvent::Connected(_, _) => unreachable!(), // Used for explicit connections.
        NetEvent::Accepted(_endpoint, _listener) => log::info!("Client connected"), // Tcp or Ws
        NetEvent::Message(endpoint, data) => {
            let message: FromClientMessage = bincode::deserialize(&data).unwrap();
            let response_message = dispatcher
                .lock()
                .unwrap()
                .clone()
                .dispatch(message.clone())
                .expect("It could no dispatch message");
            log::info!("response message:{:?}", message);
            let response = bincode::serialize(&response_message).expect("It could not serialize ");
            log::info!("response:{:?}", response);

            handler.network().send(endpoint, &response);
        }
        NetEvent::Disconnected(_endpoint) => log::info!("Client disconnected"), //Tcp or Ws
    });
}

/// Network function for setting up a message-io client.
pub fn run_client<T: ClientDispatcher + Clone>(
    message: FromClientMessage,
    dispatcher: Arc<Mutex<T>>,
) {
    let port = std::env::var("PORT").unwrap_or("3042".to_string());
    let host = std::env::var("HOST").unwrap_or("0.0.0.0".to_string());
    let address = format!("{:}:{:}", host, port);

    let (handler, listener) = node::split();

    let (server, _) = handler
        .network()
        .connect(Transport::FramedTcp, address)
        .unwrap();

    listener.for_each(move |event| match event {
        NodeEvent::Network(net_event) => match net_event {
            NetEvent::Connected(_endpoint, _ok) => handler.signals().send(Signal::Greet),
            NetEvent::Accepted(_, _) => unreachable!(), // Only generated by listening
            NetEvent::Message(_endpoint, data) => {
                let message: FromServerMessage =
                    bincode::deserialize(&data).expect("It could not serialize the data");
                dispatcher.lock().unwrap().clone().dispatch(message.clone());
            }
            NetEvent::Disconnected(_endpoint) => (),
        },
        NodeEvent::Signal(signal) => match signal {
            Signal::Greet => {
                handler
                    .network()
                    .send(server, &bincode::serialize(&message).unwrap());
            }
        },
    });
}
```

and the supported messages


```Rust
//message.rs
/// Set of available messages for message-io communication.
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum FromClientMessage {
    Ping,
    Read(String, Option<String>, Option<u64>),
    Write(String, String, u64),
    UnknownPong, // Used for non-connection oriented protocols
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum FromServerMessage {
    WrittenAt(u64),
    Pong(String), // Used for connection oriented protocols
    UnknownPong,  // Used for non-connection oriented protocols
}

pub enum Signal {
    Greet,
    // Any other app event here.
}
```
It works with callback that they are applied via dispatchers for both `Client` and `Server`


Then, we should implement our first module that it is the lamport clock structure


```Rust
//lamport.rs
use std::cmp;

#[derive(Default, Clone)]
pub struct LamportClock {
    pub latest_time: u64,
}

impl LamportClock {
    pub fn new(latest_time: u64) -> Self {
        LamportClock { latest_time }
    }
    pub fn tick(&mut self, request_time: u64) -> u64 {
        self.latest_time = cmp::max(self.latest_time, request_time);
        self.latest_time += 1;
        return self.latest_time;
    }
}
```