+++
title = "Distributed systems concepts (Part 2)"
date = "2023-09-29"
+++

I implemented the domain logic for the [Lamport clock](https://martinfowler.com/articles/patterns-of-distributed-systems/lamport-clock.html) synchronization. 

We could apply the single responsibility, and split the network protocol library from the domain logic that it must be done. Furthermore, It is necessary to include some entity domain classes, but it is going to be in another module.

Here the domain logic for the client and server
```Rust
use crate::adapters::lamport::LamportClock;
use crate::adapters::network::message::{FromClientMessage, FromServerMessage};
use crate::adapters::network::net::{ClientDispatcher, ServerDispatcher};
use crate::entity::{SerializedValue, VersionedValue};
use std::collections::HashMap;

#[derive(Clone, Default)]
pub struct DistributedServerDispatcher {
    clock: LamportClock,
    mvvc_store: HashMap<VersionedValue, SerializedValue>,
}

impl DistributedServerDispatcher {
    pub fn new(
        clock: LamportClock,
        mvvc_store: HashMap<VersionedValue, SerializedValue>,
    ) -> DistributedServerDispatcher {
        DistributedServerDispatcher { clock, mvvc_store }
    }

    pub fn write(&mut self, key: String, value: String, request_time: u64) -> u64 {
        log::info!(
            "I received a new entry from a client: {:}={:}, time={:}",
            key,
            value,
            request_time
        );
        let time = self.clock.tick(request_time);
        self.mvvc_store.insert(
            VersionedValue::new(key.as_str(), time),
            SerializedValue::new(value),
        );
        return time;
    }
}

impl ServerDispatcher for DistributedServerDispatcher {
    fn dispatch(&mut self, received: FromClientMessage) -> Option<FromServerMessage> {
        log::info!("I received a message from the client  {:?}", received);
        match received {
            FromClientMessage::Write(key, value, clock) => {
                let time = self.write(key, value, clock);
                Some(FromServerMessage::WrittenAt(time))
            }
            _ => Some(FromServerMessage::UnknownPong),
        }
    }
}

#[derive(Clone, Default)]
pub struct DistributedClientDispatcher {}

impl DistributedClientDispatcher {
    pub fn new() -> Self {
        DistributedClientDispatcher {}
    }
}

impl ClientDispatcher for DistributedClientDispatcher {
    fn dispatch(&mut self, received: FromServerMessage) -> Option<FromClientMessage> {
        log::info!("I received a message from the server  {:?}", received);
        match received {
            FromServerMessage::WrittenAt(clock) => {
                log::info!("Received latest time from server: {:}", clock);
            }
            _ => {
                log::info!("Unknown response");
            }
        }
        None
    }
}
```

Here the entity domain modules

```Rust
/// Entity domain code, it defines the necessary
/// relationship in the code.
use std::str::FromStr;

/// Node network structure representaiton.
#[derive(Clone)]
pub struct Node {
    pub address: String,
}

impl Node {
    pub fn from_env() -> Self {
        let port = std::env::var("PORT").unwrap_or("3042".to_string());
        let host = std::env::var("HOST").unwrap_or("0.0.0.0".to_string());
        let address = format!("{:}:{:}", host, port);
        Node { address }
    }
}
impl Default for Node {
    fn default() -> Self {
        Node {
            address: "0.0.0.0:3042".to_string(),
        }
    }
}

#[derive(Clone, Hash, Eq, PartialEq, Debug)]
pub struct VersionedValue {
    pub key: String,
    pub time: u64,
    versioned_value: String,
}

impl VersionedValue {
    pub fn new(key: &str, time: u64) -> Self {
        let versioned_value = format!("{:}@{:}", key.to_string(), time);
        VersionedValue {
            key: key.to_string(),
            time,
            versioned_value,
        }
    }
}
impl ToString for VersionedValue {
    fn to_string(&self) -> String {
        self.versioned_value.clone()
    }
}
#[derive(Debug)]
pub struct ParseVersionedError {}

impl FromStr for VersionedValue {
    type Err = ParseVersionedError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut splitted = s.split("@");
        let key = splitted.next().ok_or(ParseVersionedError {})?;
        let time = splitted.next().ok_or(ParseVersionedError {})?;
        Ok(VersionedValue {
            key: key.to_string(),
            time: time.parse::<u64>().map_err(|_| ParseVersionedError {})?,
            versioned_value: s.to_string(),
        })
    }
}

#[derive(Clone)]
pub struct SerializedValue {
    value: String,
}

impl ToString for SerializedValue {
    fn to_string(&self) -> String {
        self.value.clone()
    }
}

impl SerializedValue {
    pub fn new(value: String) -> Self {
        SerializedValue { value }
    }
}
```