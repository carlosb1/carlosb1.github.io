+++
title = "Implement an encoder/decoder for tokio"
date = "2023-08-30"
+++

It is possible have confusion about Polymorphism in Rust... Some people can think that it is not possible and they are only for dynamic languages, where the object's size and its reference doesn't to be known in the compilation step. 

```Rust
use std::rc::Rc;

#[derive(Copy, Clone)]
struct Pig {
    name: &'static str
}

#[derive(Copy, Clone)]
struct Dog {
    name: &'static str
}

trait Animal {
    fn sound(&self);
}

impl Animal for Pig {
    fn sound(&self) {
        println!("this is a {} pig", self.name);
    }
}

impl Animal for Dog {
    fn sound(&self) {
        println!("this is a {} dog", self.name);
    }
}


struct Farm {
    animal: Rc<dyn Animal>,
}
impl Farm {
    fn hello_farm(&self) {
        self.animal.sound();
    }
}


struct Family {
   animal: Rc<dyn Animal> 
}
```


```Rust
fn main () {
    let pig = Pig{name: "pig1"};
    pig.sound();
    let dog = Dog{name: "dog1"};
    dog.sound();
    let ref_pig = Rc::new(pig);
    let farm = Farm{animal: ref_pig.clone()};
    let farm2 = Farm{animal: ref_pig.clone()};
    let farm3 = Farm{animal: Rc::new(dog)};

    farm.hello_farm();
    farm2.hello_farm();
    farm3.hello_farm();

}
```

The question is how does it work? Easy, all these objects are saved in the heap memory.. `Rc` works a a reference to this memory space... In this case, Rust confidences in the `Rc`, you only requirement as a good practice it is to specify as `dyn` the traits.
