import "./service-details.scss"

import React from "react";
import { observer } from "mobx-react";
import { t, Trans } from "@lingui/macro";
import { DrawerItem, DrawerTitle } from "../drawer";
import { Badge } from "../badge";
import { KubeEventDetails } from "../+events/kube-event-details";
import { KubeObjectDetailsProps } from "../kube-object";
import { Service, serviceApi } from "../../api/endpoints";
import { _i18n } from "../../i18n";
import { apiManager } from "../../api/api-manager";
import { KubeObjectMeta } from "../kube-object/kube-object-meta";
import { Icon } from "../icon";
import { terminalStore } from "../dock/terminal.store";
import { apiBase } from "../../api"

interface Props extends KubeObjectDetailsProps<Service> {
}

@observer
export class ServiceDetails extends React.Component<Props> {
  async portForward(port: string) {
    const { object: service } = this.props
    const targetPort = port.split(":")[0]

    apiBase.get(`/services/${service.getNs()}/${service.getName()}/port-forward/${targetPort}`);
  }

  render() {
    const { object: service } = this.props;
    if (!service) return;
    const { spec } = service;
    const portBadges = service.getPorts().map((port) => {
      return([
        <Badge key={port} label={port}> <Icon material="open_in_new" small={true} onClick={() => this.portForward(port) } title={_i18n._(t`Open in a browser (port-forward)`)}/></Badge>
      ])
    })
    return (
      <div className="ServicesDetails">
        <KubeObjectMeta object={service}/>

        <DrawerItem name={<Trans>Selector</Trans>} labelsOnly>
          {service.getSelector().map(selector => <Badge key={selector} label={selector}/>)}
        </DrawerItem>

        <DrawerItem name={<Trans>Type</Trans>}>
          {spec.type}
        </DrawerItem>

        <DrawerItem name={<Trans>Session Affinity</Trans>}>
          {spec.sessionAffinity}
        </DrawerItem>

        <DrawerTitle title={_i18n._(t`Connection`)}/>

        <DrawerItem name={<Trans>Cluster IP</Trans>}>
          {spec.clusterIP}
        </DrawerItem>

        {service.getExternalIps().length > 0 && (
          <DrawerItem name={<Trans>External IPs</Trans>}>
            {service.getExternalIps().map(ip => <div key={ip}>{ip}</div>)}
          </DrawerItem>
        )}

        <DrawerItem name={<Trans>Ports</Trans>} labelsOnly>
          {portBadges}

        </DrawerItem>

        {spec.type === "LoadBalancer" && spec.loadBalancerIP && (
          <DrawerItem name={<Trans>Load Balancer IP</Trans>}>
            {spec.loadBalancerIP}
          </DrawerItem>
        )}

        <KubeEventDetails object={service}/>
      </div>
    );
  }
}

apiManager.registerViews(serviceApi, {
  Details: ServiceDetails,
})
