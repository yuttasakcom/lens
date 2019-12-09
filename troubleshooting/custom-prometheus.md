# Using Custom Prometheus

When using custom prometheus with Lens app, Lens expects certain things for prometheus rules and labels. Below is listed the changes required to see metrics properly.


## Queries and labels used

Lens currently uses hard-coded labels in the queries it makes to Prometheus to get various metrics shown in the UI.

| Component  | Used label(s) |
|------------|-------------|
|  Node      | `kubernetes_node`, `node`, `instance`; depending on the metrics data source       |
|  Pod       | `pod_name`      |
|  Container | `container_name`          |
|  PVC       | `persistentvolumeclaim` |

### Why different labels?

This boils down to the fact that different components in the system provide the metrics using different labels. Prometheus uses collector jobs to scrape the metrics from various sources and these sources use different labels for different metrics. And unfortunately there's also variation between the labels in different version of those components.


### Cluster overview

Here are the queries used in cluster overview level:
```
    sum(
        node_memory_MemTotal_bytes{kubernetes_node=~"${nodes}"} - (node_memory_MemFree_bytes{kubernetes_node=~"${nodes}"} + node_memory_Buffers_bytes{kubernetes_node=~"${nodes}"} + node_memory_Cached_bytes{kubernetes_node=~"${nodes}"})
    )

    sum(kube_pod_container_resource_requests{node=~"${nodes}", resource="memory"})

    sum(kube_pod_container_resource_limits{node=~"${nodes}", resource="memory"})

    sum(kube_node_status_capacity{node=~"${nodes}", resource="memory"})

    sum(rate(node_cpu_seconds_total{kubernetes_node=~"${nodes}", mode=~"user|system"}[1m]))

    sum(kube_pod_container_resource_requests{node=~"${nodes}", resource="cpu"})

    sum(kube_pod_container_resource_limits{node=~"${nodes}", resource="cpu"})

    sum(kube_node_status_capacity{node=~"${nodes}", resource="cpu"})

    sum(kubelet_running_pod_count{instance=~"${nodes}"})

    sum(kube_node_status_capacity{node=~"${nodes}", resource="pods"})

    sum(node_filesystem_size_bytes{kubernetes_node=~"${nodes}", mountpoint="/"}) by (kubernetes_node)

    sum(node_filesystem_size_bytes{kubernetes_node=~"${nodes}", mountpoint="/"} - node_filesystem_avail_bytes{kubernetes_node=~"${nodes}", mountpoint="/"}) by (kubernetes_node)


```

Where `${nodes}` maps to all nodes currently seen in cluster API.

### Nodes

```
    sum (
        node_memory_MemTotal_bytes - (node_memory_MemFree_bytes + node_memory_Buffers_bytes + node_memory_Cached_bytes)
    ) by (kubernetes_node)

    sum(kube_node_status_capacity{resource="memory"}) by (node)

    sum(rate(node_cpu_seconds_total{mode=~"user|system"}[1m])) by(kubernetes_node)

    sum(kube_node_status_allocatable{resource="cpu"}) by (node)

    sum(node_filesystem_size_bytes{mountpoint="/"}) by (kubernetes_node)

    sum(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) by (kubernetes_node)
```

### Pod details

```
    sum(rate(container_cpu_usage_seconds_total{container_name!="POD",container_name!="",pod_name=~"${podSelector}",namespace="${namespace}"}[1m])) by (${selector})

    sum(kube_pod_container_resource_requests{pod=~"${podSelector}",resource="cpu",namespace="${namespace}"}) by (${selector})

    sum(kube_pod_container_resource_limits{pod=~"${podSelector}",resource="cpu",namespace="${namespace}"}) by (${selector})

    sum(container_memory_working_set_bytes{container_name!="POD",container_name!="",pod_name=~"${podSelector}",namespace="${namespace}"}) by (${selector})

    sum(kube_pod_container_resource_requests{pod=~"${podSelector}",resource="memory",namespace="${namespace}"}) by (${selector})

    sum(kube_pod_container_resource_limits{pod=~"${podSelector}",resource="memory",namespace="${namespace}"}) by (${selector})

    sum(container_fs_usage_bytes{container_name!="POD",container_name!="",pod_name=~"${podSelector}",namespace="${namespace}"}) by (${selector})

    sum(rate(container_network_receive_bytes_total{pod_name=~"${podSelector}",namespace="${namespace}"}[1m])) by (${selector})

    sum(rate(container_network_transmit_bytes_total{pod_name=~"${podSelector}",namespace="${namespace}"}[1m])) by (${selector})

```

Where:
- `${podSelector}`: The name of the pod (or pods in case of aggregated data for e.g. deployment) in question
- `${namespace}`: Namespace of the pod
- `${selector}`: Grouping labels, `pod,namespace` for pod data, `container_name,namespace` for container level metrics

### Persistent Volume Claims

```
    sum(kubelet_volume_stats_used_bytes{persistentvolumeclaim="${pvcName}",namespace="${namespace}"})
    sum(kubelet_volume_stats_capacity_bytes{persistentvolumeclaim="${pvcName}",namespace="${namespace}"})
```



## kube-prometheus

If you are using [kube-prometheus](https://github.com/coreos/kube-prometheus) a.k.a. Prometheus operator you need to tweak some labeling rules to make the metrics adhere to the labels expected by Lens.

1. To see node metrics properly, please add

```
- action: replace
  regex: (.*)
  replacement: $1
  sourceLabels:
  - __meta_kubernetes_pod_node_name
  targetLabel: kubernetes_node
```

relabeling to `node-exporter` servicemonitor crd (for example `kubectl edit -n monitoring servicemonitors node-exporter`).

2. To see cluster's pod usage on cluster overview properly, please add `metricsRelabeling` to `kubelet` service monitor (`kubectl edit -n monitoring servicemonitors kubelet`)

```
metricRelabelings:
- action: replace
  sourceLabels:
  - node
  targetLabel: instance
```

## Helm chart

1. To see cpu metrics properly, please set value of `server.global.scrape_timeout` less than 1 minute, for example

```
helm upgrade --set server.global.scrape_interval=30s prometheus stable/prometheus
```

