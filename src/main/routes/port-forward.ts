import { LensApiRequest } from "../router"
import { LensApi } from "../lens-api"
import { spawn, ChildProcessWithoutNullStreams } from "child_process"
import { bundledKubectl } from "../kubectl"
import { getFreePort } from "../port"
import { shell } from "electron"
import * as tcpPortUsed from "tcp-port-used"
import logger from "../logger"

class PortForward {
  public static portForwards: PortForward[] = []

  static getPortforward(forward: {clusterId: string; kind: string; name: string; namespace: string; port: string}) {
    return PortForward.portForwards.find((pf) => {
      return (
        pf.clusterId == forward.clusterId &&
        pf.kind == "service" &&
        pf.name == forward.name &&
        pf.namespace == forward.namespace &&
        pf.port == forward.port
      )
    })
  }

  public clusterId: string
  public process: ChildProcessWithoutNullStreams
  public kubeConfig: string
  public kind: string
  public namespace: string
  public name: string
  public port: string
  public localPort: number

  constructor(obj: any) {
    Object.assign(this, obj)
  }

  public async start() {
    this.localPort = await getFreePort(8000, 9999)
    const kubectlBin = await bundledKubectl.kubectlPath()
    const args = [
      "--kubeconfig", this.kubeConfig,
      "port-forward",
      "-n", this.namespace,
      `service/${this.name}`,
      `${this.localPort}:${this.port}`
    ]

    this.process = spawn(kubectlBin, args, {
      env: process.env
    })
    PortForward.portForwards.push(this)
    this.process.on("exit", () => {
      const index = PortForward.portForwards.indexOf(this)
      if (index > -1) {
        PortForward.portForwards.splice(index, 1)
      }
    })
    try {
      await tcpPortUsed.waitUntilUsed(this.localPort, 500, 3000)
      return true
    } catch (error) {
      this.process.kill()
      return false
    }
  }

  public open() {
    shell.openExternal(`http://localhost:${this.localPort}`)
  }
}

class PortForwardRoute extends LensApi {

  public async routeServicePortForward(request: LensApiRequest) {
    const { params, response, cluster} = request

    let portForward = PortForward.getPortforward({
      clusterId: cluster.id, kind: "service", name: params.service,
      namespace: params.namespace, port: params.port
    })
    if (!portForward) {
      logger.info(`Creating a new port-forward ${params.namespace}/${params.service}:${params.port}`)
      portForward = new PortForward({
        clusterId: cluster.id,
        kind: "service",
        namespace: params.namespace,
        name: params.service,
        port: params.port,
        kubeConfig: cluster.kubeconfigPath()
      })
      const started = await portForward.start()
      if (!started) {
        this.respondJson(response, {
          message: "FOO"
        }, 400)
        return
      }
    }

    portForward.open()

    this.respondJson(response, {})
  }
}

export const portForwardRoute = new PortForwardRoute()
