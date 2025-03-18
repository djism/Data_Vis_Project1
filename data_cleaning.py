import pandas as pd

# Load the dataset
url = "https://archive.ics.uci.edu/ml/machine-learning-databases/adult/adult.data"
column_names = [
    "Age", "Workclass", "Fnlwgt", "Education", "Education-num", "Marital-status",
    "Occupation", "Relationship", "Race", "Sex", "Capital-gain", "Capital-loss",
    "Hours-per-week", "Native-country", "Income"
]
data = pd.read_csv(url, header=None, names=column_names, na_values="?", skipinitialspace=True)

# Drop rows with missing values
data = data.dropna()

# Sample 500 rows
sampled_data = data.sample(n=500, random_state=42)

# Save to CSV
sampled_data.to_csv('adult_census_sampled1.csv', index=False)