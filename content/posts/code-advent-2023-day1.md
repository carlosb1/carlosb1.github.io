+++
title = "Elixir solution for code advent, (day1)"
date = "2023-10-01"
+++

My implementation for the code-advent [day1](https://adventofcode.com/2022/day/1)

```Elixir
defmodule Day1 do
  def run(arg) do
    three_max_carries =
      File.read!(arg)
      |> String.split("\n\n")
      |> Enum.map(fn set_nums ->
        set_nums
        |> String.split("\n", trim: true)
        |> Enum.map(fn elem ->
          elem |> String.trim() |> String.to_integer()
        end)
        |> Enum.sum()
      end)
      |> Enum.sort()
      |> Enum.take(-3)

    three_max_carries |> IO.inspect(label: :three_max_carries)
    three_max_carries |> Enum.sum() |> IO.inspect(label: :sum_max)
  end
end

[arg1 | _] = System.argv()
Day1.run(arg1)
```
