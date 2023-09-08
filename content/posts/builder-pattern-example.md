+++
title = "Example for builder pattern"
date = "2023-08-19"
+++

## Default

Usually, a good practice in the development process is the protection of the incorrect instance constructions. This protection is for the developer, when you are managing a lot of different object instances for different purposes, a clean constructor design will provide the necessary features:

- The object can not permit the creation of an invalid designed object (for example, in a form, a `Person` object needs to include name and surname... Both parameters must be together).

- The encapsulation of the creation process... The concept of creation, it implies more steps than setting parameters. For a clean design, it implies all the necessary logic to have ready an object (domain or value object). For this reason a correct encapsulation will be provide an easy adaptation of the SOLID rule, `open for extension close for modification`
- It keeps the immutability in the objects, it creates new instances avoiding the internal modification (In this case, we can be sceptic because it)
- It split responsibilities. Then, the code will be easier to read and maintain,

These points are only a few ones of the most important, but it can be found a lot of mores in articles from Martin Fowler or Uncle bob

In this case, Rust provides a simple feature , named `Default` for avoiding a big constructor that it can be a first step in the creation of an object. Here one example:

```Rust
use std::default;
use std::fmt;

struct Example {
    param: String,
    param2: u32,
    param3: String,
    optional: Option<String>,
    optional2: Option<String>,
}

impl fmt::Display for Example {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "param={}, param2={}, param3={}, optional={:?}, optional2={:?}",
            self.param, self.param2, self.param3, self.optional, self.optional2
        )
    }
}
impl Default for Example {
    fn default() -> Self {
        Example {
            param: "default".to_string(),
            param2: 1,
            param3: "default3".to_string(),
            optional: None,
            optional2: Some("optional2".to_string()),
        }
    }
}
```
With this, you only need to use in the constructor not default params... it can simplify the creation, here we have how it can be created:

```Rust
pub fn main() {
    println!(
        "example={:}",
        Example {
            param3: "anotherparam".to_string(),
            ..Default::default()
        }
    );

    println!(
        "example2={:}",
        Example {
            param2: 2,
            ..Default::default()
        }
    );
}
```
In both constructors, we only initialize one param (`param3` and `param2`), they are very useful in simple cases.

## Builder pattern

Other useful design pattern is the famous `builder` pattern. It provides flexibility in the creation of the instances that avoids the construction of invalid objects (instances that can not exist as an entity). Here we have an example: 

```Rust
#[derive(Default)]
struct ExampleBuilder {
    param: String,
    param2: u32,
    param3: String,
    optional: Option<String>,
    optional2: Option<String>,
}

impl ExampleBuilder {
    fn new(param: String, param2: u32, param3: String) -> Self {
        ExampleBuilder {
            param,
            param2,
            param3,
            ..Default::default()
        }
    }
    pub fn optional(mut self, optional: String) -> Self {
        self.optional = Some(optional);
        return self;
    }
    pub fn optional2(mut self, optional2: String) -> Self {
        self.optional2 = Some(optional2);
        return self;
    }
    pub fn build(self) -> Example {
        Example {
            param: self.param,
            param2: self.param2,
            param3: self.param3,
            optional: self.optional,
            optional2: self.optional2,
        }
    }
```

It forces to include to add the mandatory parameters with the `new` function... The builder pattern would create a consistent object in any step... Furthermore, if we want to include some of the optional parameters, we use `optional` or `optional2` functions. Ideally, in the last step, calling the `build` function, it can includes the necessary post steps. Then, the  creation step will be:

```Rust
    let example = ExampleBuilder::new("param1".to_string(), 1, "param3".to_string()).build();
    //Setting up optional parameters
    let example2 = ExampleBuilder::new("param1".to_string(), 1, "param3".to_string())
        .optional("option1".to_string())
        .optional2("option2".to_string())
        .build();
```
