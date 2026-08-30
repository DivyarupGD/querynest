// Run after generate-interview-data.js to create Parquet equivalents locally.
val dataRoot = "local-spark-runner/datasets"
Seq("customers", "orders", "events").foreach { name =>
  spark.read.option("header", "true").option("inferSchema", "true").csv(s"$dataRoot/$name/$name.csv")
    .write.mode("overwrite").parquet(s"$dataRoot/$name/$name.parquet")
}
System.exit(0)
