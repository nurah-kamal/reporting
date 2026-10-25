# Data Science Salary Explorer

How does data science pay vary by role, experience, company size and country? A Tableau dashboard on 607 salaries from the Kaggle [Data Science Job Salaries](https://www.kaggle.com/datasets/ruchi798/data-science-job-salaries) dataset, covering 2020 to 2022.

![The Data Science Salary Explorer dashboard](Data%20Science%20Dashboard.png)

## What it shows

- Pay by job title and by experience level, from entry level to executive.
- Pay by company size and by the country the company is in.
- How pay moved across 2020, 2021 and 2022.

Salaries are compared in US dollars (the dataset's `salary_in_usd` column), so pay in different currencies can sit on one scale.

## Files

- `Workbook/Data Science Salary Explorer.twbx`: the packaged workbook. Open it in Tableau Desktop or Tableau Public.
- `Data Set/ds_salaries.csv`: the data.

## A caution

607 rows across many roles and countries means some groups have only a handful of salaries. A country or title with three rows can look high or low by chance.
